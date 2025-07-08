// packages/shared/hooks/useManageProfileForm.ts
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import type {
  UpdatedProfileData,
  AvailableProfile,
  MappedProfile,
  GalleryImage,
} from '@mytutorapp/shared/types';
import {
  fetchMyProfile,
  fetchAvailableProfiles,
  updateProfile,
  deleteGalleryImage,
  deleteVideo,
} from '@mytutorapp/shared/api';
import { uploadAsset } from '@mytutorapp/shared/api/uploadAsset';
import { useShopContext } from '@mytutorapp/shared/context';

// Helper to extract a value from either a string or a change event
function extractValue(
  input: string | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
): string {
  return typeof input === 'string'
    ? input
    : (input.target as { value: string }).value;
}

// Initial empty state
const initialProfileData: UpdatedProfileData = {
  name: '',
  age: 0,
  bio: '',
  expertise: [],
  teachingStyle: [],
  status: 'Offline',
  notifications: false,
  gallery: [null, null, null, null],
  video: '',
  languages: {
    English: false,
    Swahili: false,
    French: false,
    Spanish: false,
    German: false,
  },
  pricing: { privateSession: 0, groupSession: 0, lecture: 0, workshop: 0 },
  experienceLevel: '',
  ageGroup: [],
  category: '',
  recommended: [],
  paymentMethod: 'bank',
  bankAccount: '',
  bankCode: '',
  mpesaPhoneNumber: '',
};

const useManageProfileForm = (navigate: (path: string) => void) => {
  const { token, backendUrl, refreshProfile } = useShopContext();

  const [role, setRole] = useState<'tutor' | 'student' | ''>('');
  const [isUploading, setIsUploading] = useState(false);
  const [initialData, setInitialData] = useState<UpdatedProfileData | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<AvailableProfile[]>([]);
  const [searchResults, setSearchResults] = useState<AvailableProfile[]>([]);
  const [profile, setProfile] = useState<MappedProfile | null>(null);
  const [updatedData, setUpdatedData] = useState<UpdatedProfileData>(
    initialProfileData
  );

  // Redirect if not logged in
  useEffect(() => {
    if (!token) {
      toast.error('Please log in to manage your profile.');
      navigate('/login');
    }
  }, [token, navigate]);

  // Fetch my profile…
  useEffect(() => {
    if (!token || !backendUrl) return;
    (async () => {
      try {
        const { profileExists, profile: raw } = await fetchMyProfile(
          backendUrl,
          token
        );
        if (!profileExists || !raw) {
          setUpdatedData(prev => ({
            ...prev,
            gallery: [null, null, null, null],
          }));
          return;
        }

        // …map and normalize…
        const galleryArray = Array.isArray(raw.gallery) ? raw.gallery : [];
        const gallery: GalleryImage[] = galleryArray
          .slice(0, 4)
          .concat(Array(4 - galleryArray.length).fill(null));

        const {
          age_group,
          payment_method,
          bank_account,
          bank_code,
          mpesa_phone_number,
          experience_level,
          recommended,
          pricing,
          description,
          ...rest
        } = raw;
        const mapped: MappedProfile = {
          ...rest,
          ageGroup: age_group || [],
          paymentMethod: payment_method || '',
          bankAccount: bank_account || '',
          bankCode: bank_code || '',
          mpesaPhoneNumber: mpesa_phone_number || '',
          experienceLevel: experience_level || '',
          recommended: recommended || [],
          pricing: pricing || {},
          description: description || {},
        };

        setRole(raw.role);

        // build languages
        const languageSelection: Record<string, boolean> = {
          English: false,
          Swahili: false,
          French: false,
          Spanish: false,
          German: false,
        };
        if (Array.isArray(raw.languages)) {
        raw.languages.forEach((lang: string) => {
          if (lang in languageSelection) {
            languageSelection[lang] = true;
          }
        });
      }

        const finalData: UpdatedProfileData = {
          ...initialProfileData,
          ...mapped,
          gallery,
          video: mapped.video || '',
          languages: languageSelection,
          pricing: mapped.pricing as UpdatedProfileData['pricing'],
          experienceLevel: mapped.experienceLevel,
          teachingStyle: mapped.description?.teachingStyle || [],
          ageGroup: mapped.ageGroup || [],
          bio: mapped.description?.bio || '',
          expertise: mapped.description?.expertise || [],
          category: mapped.category || '',
        };

        setUpdatedData(finalData);
        setInitialData(finalData);
        setProfile(mapped);
      } catch (err) {
        console.error('Fetch Profile Error:', err);
        toast.error('Failed to load profile.');
      }
    })();
  }, [backendUrl, token, navigate]);

  // Fetch available profiles…
  useEffect(() => {
    if (!token || !backendUrl) return;
    (async () => {
      try {
        const { success, profiles } = await fetchAvailableProfiles(
          backendUrl,
          token
        );
        if (success) setAvailableProfiles(profiles);
        else toast.error('Failed to load profiles data.');
      } catch {
        toast.error('Unable to load profiles.');
      }
    })();
  }, [backendUrl, token]);

  const isDataChanged = (
    newData: UpdatedProfileData,
    orig: UpdatedProfileData | null
  ) => JSON.stringify(newData) !== JSON.stringify(orig);

  // Generic handlers…
  const handleInputChange = (
    field: keyof UpdatedProfileData,
    input:
      | string
      | React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
  ) => {
    const value = extractValue(input);
    setUpdatedData(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = (
    input: string | React.ChangeEvent<HTMLInputElement>
  ) => {
    const term = extractValue(input).toLowerCase();
    setSearchResults(
      availableProfiles.filter(p =>
        p.name.toLowerCase().includes(term)
      )
    );
  };

  const handlePricingChange = (
    field: keyof UpdatedProfileData['pricing'],
    input: string | React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(extractValue(input));
    setUpdatedData(prev => ({
      ...prev,
      pricing: { ...prev.pricing, [field]: value },
    }));
  };

  const handlePaymentMethodChange = (
    input: string | React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = extractValue(input) as 'bank' | 'mpesa';
    setUpdatedData(prev => ({
      ...prev,
      paymentMethod: value,
      bankAccount: value === 'bank' ? prev.bankAccount : '',
      bankCode: value === 'bank' ? prev.bankCode : '',
      mpesaPhoneNumber: value === 'mpesa' ? prev.mpesaPhoneNumber : '',
    }));
  };

  const handlePaymentDetailsChange = (
    field: 'bankAccount' | 'bankCode' | 'mpesaPhoneNumber',
    input: string | React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = extractValue(input);
    setUpdatedData(prev => ({ ...prev, [field]: value }));
  };

  const handleLanguageSelect = (language: string) => {
    setUpdatedData(prev => ({
      ...prev,
      languages: {
        ...prev.languages,
        [language]: !prev.languages[language as keyof typeof prev.languages],
      },
    }));
  };

  const handleAddRecommendation = (id: string) => {
    setUpdatedData(prev => ({
      ...prev,
      recommended: [...prev.recommended, id],
    }));
  };

  const handleRemoveRecommendation = (id: string) => {
    setUpdatedData(prev => ({
      ...prev,
      recommended: prev.recommended.filter(pid => pid !== id),
    }));
  };

  const handleAgeGroupSelect = (group: string) => {
    setUpdatedData(prev => ({
      ...prev,
      ageGroup: prev.ageGroup.includes(group)
        ? prev.ageGroup.filter(g => g !== group)
        : [...prev.ageGroup, group],
    }));
  };

  const handleTeachingStyleSelect = (style: string) => {
    setUpdatedData(prev => ({
      ...prev,
      teachingStyle: prev.teachingStyle.includes(style)
        ? prev.teachingStyle.filter(s => s !== style)
        : [...prev.teachingStyle, style],
    }));
  };

  // — New: video‐duration‐checked file change —
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    type: 'image' | 'video' = 'image'
  ) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (type === 'image') {
      setUpdatedData(prev => {
        const gallery = [...prev.gallery];
        gallery[index] = file;
        return { ...prev, gallery };
      });
    } else {
      // load metadata in a <video> element to get duration
      const url = URL.createObjectURL(file);
      const tmp = document.createElement('video');
      tmp.preload = 'metadata';
      tmp.onloadedmetadata = () => {
        URL.revokeObjectURL(tmp.src);
        if (tmp.duration > 30) {
          toast.error(`Video too long (${tmp.duration.toFixed(1)}s). Must be ≤30s.`);
        } else {
          setUpdatedData(prev => ({ ...prev, video: file }));
        }
      };
      tmp.src = url;
    }
  };

  const handleDeleteImage = async (index: number) => {
    if (!profile?.id) return;
    const url = updatedData.gallery[index];
    if (typeof url !== 'string') return;
    try {
      await deleteGalleryImage(backendUrl!, token!, profile.id, url);
      setUpdatedData(prev => {
        const gallery = [...prev.gallery];
        gallery[index] = null;
        return { ...prev, gallery };
      });
      toast.success('Image deleted successfully.');
    } catch {
      toast.error('Failed to delete image.');
    }
  };

  const handleDeleteVideo = async () => {
    if (!profile?.id || typeof updatedData.video !== 'string') return;
    try {
      await deleteVideo(backendUrl!, token!, profile.id, updatedData.video);
      setUpdatedData(prev => ({ ...prev, video: '' }));
      toast.success('Video deleted successfully.');
    } catch {
      toast.error('Failed to delete video.');
    }
  };

  const handleToggleNotifications = () => {
    setUpdatedData(prev => ({
      ...prev,
      notifications: !prev.notifications,
    }));
  };

  // Submit: first upload new assets, then send JSON
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isDataChanged(updatedData, initialData)) {
      toast.info('No changes detected');
      return;
    }
    setIsUploading(true);
    try {
      // upload images…
      const galleryUrls = await Promise.all(
        updatedData.gallery.map(async img => {
          if (img instanceof File) {
            return uploadAsset(backendUrl!, token!, img, 'image');
          }
          return (img as string) ?? null;
        })
      );
      const finalGallery = galleryUrls.filter((u): u is string => !!u);

      // upload video…
      let finalVideo = '';
      if (updatedData.video instanceof File) {
        finalVideo = await uploadAsset(
          backendUrl!,
          token!,
          updatedData.video,
          'video'
        );
      } else if (typeof updatedData.video === 'string') {
        finalVideo = updatedData.video;
      }

      // build payload…
      const payload: Record<string, unknown> = {
        name: updatedData.name,
        age: updatedData.age,
        languages: Object.keys(updatedData.languages).filter(
          lang => updatedData.languages[lang as keyof typeof updatedData.languages]
        ),
        ageGroup: updatedData.ageGroup ?? [],
      };
      if (role === 'tutor') {
        payload.category = updatedData.category;
        payload.status = updatedData.status;
        payload.description = {
          bio: updatedData.bio,
          expertise: updatedData.expertise,
          teachingStyle: updatedData.teachingStyle,
        };
        payload.pricing = updatedData.pricing;
        payload.experienceLevel = updatedData.experienceLevel;
        payload.recommended = updatedData.recommended;
        payload.paymentMethod = updatedData.paymentMethod;
        if (updatedData.paymentMethod === 'bank') {
          payload.bankAccount = updatedData.bankAccount;
          payload.bankCode = updatedData.bankCode;
        } else {
          payload.mpesaPhoneNumber = updatedData.mpesaPhoneNumber;
        }
        payload.gallery = finalGallery;
        payload.video = finalVideo;
      }
       console.log('🚀 Submitting profile payload:', payload);


      const response = await updateProfile(
        backendUrl!,
        token!,
        payload
      );
      if (response.status === 200) {
        toast.success('Profile updated successfully!');
        setInitialData(updatedData);
        refreshProfile?.();
        navigate('Home');
      } else {
        toast.error('Failed to update profile.');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setIsUploading(false);
    }
  };

  return {
    role,
    updatedData,
    setUpdatedData,
    availableProfiles,
    searchResults,
    isUploading,
    handleInputChange,
    handleLanguageSelect,
    handleSearch,
    handleAddRecommendation,
    handleRemoveRecommendation,
    handlePricingChange,
    handleFileChange,        // <- now with 30s video check
    handleDeleteImage,
    handleDeleteVideo,
    handleToggleNotifications,
    handlePaymentMethodChange,
    handlePaymentDetailsChange,
    handleAgeGroupSelect,
    handleTeachingStyleSelect,
    handleSubmit,
  };
};

export default useManageProfileForm;
