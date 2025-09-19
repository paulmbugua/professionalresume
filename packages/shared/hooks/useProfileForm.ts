// packages/shared/hooks/useProfileForm.ts
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import useAppQuery from './useAppQuery';
import axios from 'axios';
import {
  ProfilePayload, Role, UploadAsset,
  PayoutCurrency, PayoutMethod,
} from '@mytutorapp/shared/types';
import { fetchUserRole, createProfileJson } from '@mytutorapp/shared/api/profileApi';
import { uploadAsset } from '@mytutorapp/shared/api/uploadAsset';
import { getDirectSignature, directUploadToCloudinary } from '@mytutorapp/shared/api/cloudinaryDirect';
import { useShopContext } from '@mytutorapp/shared/context';

export interface UseProfileFormOptions {
  onSuccess?: () => void;
  token?: string;
  /** Provide a notifier to keep this hook UI-agnostic */
  notify?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const MPESA_REGEX = /^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const useProfileForm = (options?: UseProfileFormOptions) => {
  const { onSuccess, token: tokenProp, notify } = options ?? {};
  const { token: contextToken, refreshProfile, backendUrl } = useShopContext();
  const token = tokenProp ?? contextToken ?? '';

  // role
  const {
    data: role,
    isLoading: isRoleLoading,
    error: roleError,
  } = useAppQuery<Role, Error>(
    ['userRole', token],
    async () => {
      const r = await fetchUserRole(backendUrl, token);
      return r as Role;
    },
    { enabled: Boolean(token) }
  );

  useEffect(() => {
    if (roleError) {
      console.error('useProfileForm → roleError:', roleError);
      notify?.('Error fetching user role', 'error');
    }
  }, [roleError, notify]);

  // form state...
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [languages, setLanguages] = useState<Record<string, boolean>>({
    English: false, Swahili: false, French: false, Spanish: false, German: false,
  });
  const [ageGroup, setAgeGroup] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState<string[]>([]);
  const [teachingStyle, setTeachingStyle] = useState<string[]>([]);
  const [pricing, setPricing] = useState({
    privateSession: '', groupSession: '', lecture: '', workshop: '',
  });

  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('wise');
  const payoutCurrency: PayoutCurrency = payoutMethod === 'mpesa' ? 'KES' : 'USD';

  const [images, setImages] = useState<(UploadAsset | File | null)[]>([null, null, null, null]);
  const [video, setVideo] = useState<UploadAsset | File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const [step, setStep] =
    useState<'idle' | 'uploading' | 'creating' | 'done' | 'bg-video'>('idle');

  const handleLanguageSelect = (language: string) =>
    setLanguages(prev => ({ ...prev, [language]: !prev[language] }));

  const handleAgeGroupChange = (value: string) =>
    setAgeGroup(prev => (prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]));

  const handlePricingChange = (field: keyof typeof pricing, value: string) =>
    setPricing(prev => ({ ...prev, [field]: value }));

  const handleVideoChange = (asset: UploadAsset | File) => {
    if ('duration' in asset && asset.duration != null) {
      const raw = asset.duration as number;
      const durSec = raw > 1000 ? raw / 1000 : raw;
      if (durSec > 30) throw new Error('Video must be 30 seconds or shorter');
    }
    setVideo(asset);
    if ('uri' in asset) setVideoPreview((asset as any).uri);
    else if (typeof window !== 'undefined' && 'createObjectURL' in URL) {
      setVideoPreview(URL.createObjectURL(asset as File));
    } else {
      setVideoPreview(null);
    }
  };

  const handleRemoveVideo = () => { setVideo(null); setVideoPreview(null); };

  const mutation = useMutation<any, Error, void>({
    mutationFn: async () => {
      if (!role) throw new Error('Role not loaded');

      const selectedLanguages = Object.keys(languages).filter(l => languages[l]);

      const uploadImages = async (): Promise<string[]> => {
        if (role !== 'tutor') return [];
        const valid = images.filter((i): i is UploadAsset | File => i !== null);
        if (valid.length === 0) throw new Error('At least one profile image is required.');
        return Promise.all(valid.map(async (file) => {
          const uri = file instanceof File ? file : (file as any).uri ?? (file as any).url;
          if (!uri) throw new Error('Invalid image asset.');
          return uploadAsset(backendUrl, token, uri, 'image');
        }));
      };

      setStep('uploading');
      const gallery = await uploadImages();

      if (role === 'tutor') {
        if (payoutMethod === 'mpesa') {
          if (!MPESA_REGEX.test(mpesaPhoneNumber)) {
            throw new Error('Valid M-Pesa phone number is required for KES payouts.');
          }
        } else if (payoutMethod === 'wise') {
          if (!EMAIL_REGEX.test(wiseEmail)) {
            throw new Error('A valid Wise account email is required for USD payouts.');
          }
        }
      }

      const toNumber = (v: string) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const payload: ProfilePayload = {
        role: role as Role,
        name: name.trim(),
        age: Number(age),
        languages: selectedLanguages,
        ageGroup,
        ...(role === 'tutor' && {
          category,
          description: { bio, expertise, teachingStyle },
          pricing: {
            privateSession: toNumber(pricing.privateSession),
            groupSession: toNumber(pricing.groupSession),
            lecture: toNumber(pricing.lecture),
            workshop: toNumber(pricing.workshop),
          },
          payoutCurrency,
          payoutMethod,
          ...(payoutMethod === 'mpesa' && { mpesaPhoneNumber }),
          ...(payoutMethod === 'wise' && { wiseEmail: wiseEmail.trim() }),
          gallery,
        }),
      };

      if (process.env.NODE_ENV !== 'production') {
        try { console.log('🔎 useProfileForm → payload (no video):', JSON.stringify(payload, null, 2)); } catch {}
      }

      setStep('creating');
      let res;
      try {
        res = await createProfileJson(backendUrl, token, payload);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response) {
          if (process.env.NODE_ENV !== 'production') {
            console.error('❌ useProfileForm → error response:', err.response.data);
          }
          throw new Error(err.response.data.message);
        }
        throw err;
      }

      if (res.status !== 201) throw new Error(`Unexpected status: ${res.status}`);

      if (role === 'tutor' && video) {
        setStep('bg-video');
        (async () => {
          try {
            let blobOrFile: File | Blob | null = null;
            if (video instanceof File) blobOrFile = video;
            else {
              const src = (video as any).uri || (video as any).url;
              if (src) {
                const resp = await fetch(src);
                blobOrFile = await resp.blob();
              }
            }
            if (!blobOrFile) return;

            const sig = await getDirectSignature(backendUrl, token, {
              resourceType: 'video', folder: 'class_vault',
            });

            const videoUrl = await directUploadToCloudinary(blobOrFile, {
              cloudName: sig.cloudName,
              apiKey: sig.apiKey,
              signature: sig.signature,
              timestamp: sig.timestamp,
              folder: sig.folder,
              resourceType: 'video',
            });

            await axios.patch(
              `${backendUrl}/api/profile/video`,
              { video: videoUrl },
              { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
            );
            notify?.('Your intro video has been processed.', 'success');
          } catch (bgErr: any) {
            console.error('Background video upload failed:', bgErr);
            notify?.('Video upload failed in background. You can re-upload from your profile.', 'error');
          } finally {
            setStep('done');
          }
        })();
      } else {
        setStep('done');
      }

      return res.data;
    },

    onSuccess: () => {
      notify?.('Profile created successfully!', 'success');
      refreshProfile?.();
      onSuccess?.();
      setTimeout(() => { if (step !== 'bg-video') setStep('idle'); }, 600);
    },

    onError: (err: Error) => {
      const msg = axios.isAxiosError(err) ? (err.response?.data?.message || err.message) : err.message;
      console.error('useProfileForm error:', msg);
      notify?.(msg, 'error');
      setStep('idle');
    },
  });

  const [wiseEmail, setWiseEmail] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');

  const handleSubmit = (e?: React.FormEvent) => { e?.preventDefault?.(); mutation.mutate(); };

  return {
    role, isRoleLoading, roleError,
    name, setName,
    age, setAge,
    languages, handleLanguageSelect,
    ageGroup, handleAgeGroupChange,
    category, setCategory,
    bio, setBio,
    expertise, setExpertise,
    teachingStyle, setTeachingStyle,
    pricing, handlePricingChange,
    payoutCurrency,
    payoutMethod, setPayoutMethod,
    wiseEmail, setWiseEmail,
    mpesaPhoneNumber, setMpesaPhoneNumber,
    images, setImages,
    video, videoPreview, handleVideoChange, handleRemoveVideo,
    loading: mutation.isPending,
    step,
    submitError: mutation.error,
    handleSubmit,
  };
};

export default useProfileForm;
export { useProfileForm };
