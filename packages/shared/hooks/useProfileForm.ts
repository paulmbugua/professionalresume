// packages/shared/hooks/useProfileForm.ts
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import useAppQuery from './useAppQuery';
import axios from 'axios';
import {
  ProfilePayload,
  Role,
  UploadAsset,
  PayoutCurrency,
  PayoutMethod,
} from '@mytutorapp/shared/types';
import { fetchUserRole, createProfileJson } from '@mytutorapp/shared/api/profileApi';
import { uploadAsset } from '@mytutorapp/shared/api/uploadAsset';
import { useShopContext } from '@mytutorapp/shared/context';
import { toast } from 'react-toastify';

export interface UseProfileFormOptions {
  onSuccess?: () => void;
  token?: string;
  notify?: (message: string, type?: 'success' | 'error') => void;
}

const MPESA_REGEX = /^(?:07|2547|\+2547|01|2541|\+2541)\d{8}$/;

const useProfileForm = (options?: UseProfileFormOptions) => {
  const { onSuccess, token: tokenProp, notify } = options ?? {};
  const { token: contextToken, refreshProfile, backendUrl } = useShopContext();
  const token = tokenProp ?? contextToken ?? '';

  // 1) Fetch the user's role
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

  // form state
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [languages, setLanguages] = useState<Record<string, boolean>>({
    English: false,
    Swahili: false,
    French: false,
    Spanish: false,
    German: false,
  });
  const [ageGroup, setAgeGroup] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState<string[]>([]);
  const [teachingStyle, setTeachingStyle] = useState<string[]>([]);
  const [pricing, setPricing] = useState({
    privateSession: '',
    groupSession: '',
    lecture: '',
    workshop: '',
  });
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'mpesa' | ''>(''); // legacy/general
  const [bankAccount, setBankAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');

  // NEW payout prefs (stored on profile)
  const [payoutCurrency, setPayoutCurrency] = useState<PayoutCurrency>('USD');   // was 'KES'
const [payoutMethod,   setPayoutMethod]   = useState<PayoutMethod>('stripe');  // was 'mpesa'
  const [stripeConnectId, setStripeConnectId] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');

  // Keep payout method consistent with currency + clear irrelevant fields
  useEffect(() => {
    if (payoutCurrency === 'KES') {
      if (payoutMethod !== 'mpesa') setPayoutMethod('mpesa');
      // USD-only fields shouldn’t be sent for KES
      if (stripeConnectId) setStripeConnectId('');
      if (paypalEmail) setPaypalEmail('');
    } else {
      // USD: default to stripe if an invalid method is selected
      if (!['stripe', 'paypal'].includes(payoutMethod)) {
        setPayoutMethod('stripe');
      }
      // KES-only field shouldn’t be required for USD payouts (keep legacy separate)
      // We don’t blank mpesaPhoneNumber here because legacy paymentMethod may still use it.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutCurrency]);

  // uploads
  const [images, setImages] = useState<(UploadAsset | File | null)[]>([null, null, null, null]);
  const [video, setVideo] = useState<UploadAsset | File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  // handlers
  const handleLanguageSelect = (language: string) =>
    setLanguages((prev) => ({ ...prev, [language]: !prev[language] }));

  const handleAgeGroupChange = (value: string) =>
    setAgeGroup((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const handlePricingChange = (field: keyof typeof pricing, value: string) =>
    setPricing((prev) => ({ ...prev, [field]: value }));

  const handleVideoChange = (asset: UploadAsset | File) => {
    if ('duration' in asset && asset.duration != null) {
      const raw = asset.duration;
      const durSec = raw > 1000 ? raw / 1000 : raw;
      if (durSec > 30) throw new Error('Video must be 30 seconds or shorter');
    }
    setVideo(asset);
    if ('uri' in asset) setVideoPreview(asset.uri);
    else if (typeof window !== 'undefined' && 'createObjectURL' in URL) {
      setVideoPreview(URL.createObjectURL(asset as File));
    } else {
      setVideoPreview(null);
    }
  };

  const handleRemoveVideo = () => {
    setVideo(null);
    setVideoPreview(null);
  };

  // submit
const mutation = useMutation<any, Error, void>({
  mutationFn: async () => {
    if (!role) throw new Error('Role not loaded');

    const selectedLanguages = Object.keys(languages).filter((l) => languages[l]);

    // upload images
    let gallery: string[] = [];
    if (role === 'tutor') {
      const valid = images.filter((i): i is UploadAsset | File => i !== null);
      if (valid.length === 0) throw new Error('At least one profile image is required.');
      gallery = await Promise.all(
        valid.map(async (file) => {
          const uri = file instanceof File ? file : file.uri;
          return uploadAsset(backendUrl, token, uri, 'image');
        })
      );
    }

    // upload video
    let videoUrl: string | null = null;
    if (role === 'tutor' && video) {
      const uri = video instanceof File ? video : video.uri;
      videoUrl = await uploadAsset(backendUrl, token, uri, 'video');
    }

    // light client-side checks
    if (role === 'tutor') {
      if (payoutCurrency === 'KES') {
        if (!mpesaPhoneNumber || !MPESA_REGEX.test(mpesaPhoneNumber)) {
          throw new Error('Valid M-Pesa phone number is required for KES payouts.');
        }
      } else if (payoutCurrency === 'USD') {
        if (payoutMethod === 'stripe' && !stripeConnectId.trim()) {
          throw new Error('Stripe Connect ID is required for USD payouts via Stripe.');
        }
        if (payoutMethod === 'paypal' && !paypalEmail.trim()) {
          throw new Error('PayPal email is required for USD payouts via PayPal.');
        }
        if (payoutMethod === 'mpesa') {
          throw new Error('For USD payouts, choose Stripe or PayPal.');
        }
      }
    }

    // build payload
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
        paymentMethod: paymentMethod || undefined,
        ...(paymentMethod === 'bank' && { bankAccount, bankCode }),
        ...(paymentMethod === 'mpesa' && { mpesaPhoneNumber }),

        payoutCurrency,
        payoutMethod: payoutCurrency === 'USD' ? payoutMethod : 'mpesa',
        ...(payoutCurrency === 'KES' && { mpesaPhoneNumber }),
        ...(payoutCurrency === 'USD' && payoutMethod === 'stripe' && {
          stripeConnectId: stripeConnectId.trim(),
        }),
        ...(payoutCurrency === 'USD' && payoutMethod === 'paypal' && {
          paypalEmail: paypalEmail.trim(),
        }),

        gallery,
        video: videoUrl,
      }),
    };

    // 🔎 Debug logs
    console.log('🔎 useProfileForm → backendUrl:', backendUrl);
    console.log('🔎 useProfileForm → token (short):', token?.slice(0, 10) + '...');
    console.log('🔎 useProfileForm → payload being sent:', JSON.stringify(payload, null, 2));

    let res;
    try {
      res = await createProfileJson(backendUrl, token, payload);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response) {
        console.error('❌ useProfileForm → error response:', err.response.data);
        throw new Error(err.response.data.message);
      }
      throw err;
    }

    if (res.status !== 201) {
      throw new Error(`Unexpected status: ${res.status}`);
    }
    return res.data;
  },
  
    onSuccess: () => {
      notify?.('Profile created successfully!', 'success') ?? toast.success('Profile created successfully!');
      refreshProfile?.();
      options?.onSuccess?.();
    },
    onError: (err: Error) => {
      const msg = axios.isAxiosError(err) ? err.response?.data?.message || err.message : err.message;
      notify?.(msg, 'error') ?? toast.error(msg);
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault?.();
    mutation.mutate();
  };

  return {
    // role
    role,
    isRoleLoading,
    roleError,

    // form state & setters
    name, setName,
    age, setAge,
    languages, handleLanguageSelect,
    ageGroup, handleAgeGroupChange,
    category, setCategory,
    bio, setBio,
    expertise, setExpertise,
    teachingStyle, setTeachingStyle,
    pricing, handlePricingChange,
    paymentMethod, setPaymentMethod,
    bankAccount, setBankAccount,
    bankCode, setBankCode,
    mpesaPhoneNumber, setMpesaPhoneNumber,

    // payout prefs
    payoutCurrency, setPayoutCurrency,
    payoutMethod, setPayoutMethod,
    stripeConnectId, setStripeConnectId,
    paypalEmail, setPaypalEmail,

    // uploads
    images, setImages,
    video, videoPreview, handleVideoChange, handleRemoveVideo,

    // submission
    loading: mutation.isPending,
    submitError: mutation.error,
    handleSubmit,
  };
};

export default useProfileForm;
