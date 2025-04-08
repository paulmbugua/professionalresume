import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import type {
  UpdatedProfileData,
  AvailableProfile,
  MappedProfile,
  GalleryImage
} from '@shared/types';
import {
  fetchMyProfile,
  fetchAvailableProfiles,
  updateProfile,
  deleteGalleryImage,
  deleteVideo,
} from '@shared/api';
import { useShopContext } from '@shared/context';

// Define an interface for input elements with files.
interface InputWithFiles extends HTMLInputElement {
  files: FileList | null;
}

// Define an initial state
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

/**
 * Helper function to extract a value from either a string or a change event.
 */
const extractValue = (
  input: string | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
): string => {
  return typeof input === 'string'
    ? input
    : (input.target as unknown as { value: string }).value;
};

const useManageProfileForm = (navigate: (path: string) => void) => {
  const { token, backendUrl, refreshProfile } = useShopContext();

  const [role, setRole] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [initialData, setInitialData] = useState<UpdatedProfileData | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<AvailableProfile[]>([]);
  const [searchResults, setSearchResults] = useState<AvailableProfile[]>([]);
  const [profile, setProfile] = useState<MappedProfile | null>(null);
  const [updatedData, setUpdatedData] = useState<UpdatedProfileData>(initialProfileData);

  // Check if user is authenticated
  useEffect(() => {
    if (!token) {
      toast.error('Please log in to manage your profile.');
      navigate('/login');
      return;
    }
  }, [token, navigate]);

  // Fetch the user profile
  useEffect(() => {
    if (!token || !backendUrl) return;

    const fetchProfile = async () => {
      try {
        const data = await fetchMyProfile(backendUrl, token);
        const { profileExists, profile } = data;

        if (!profileExists || !profile) {
          setUpdatedData((prev: UpdatedProfileData) => ({
            ...prev,
            gallery: [null, null, null, null],
          }));
          return;
        }

        if (!Array.isArray(profile.gallery)) profile.gallery = [];

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
        } = profile;

        const mappedProfile: MappedProfile = {
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

        const gallery: GalleryImage[] = profile.gallery.slice(0, 4)
          .concat(Array(4 - profile.gallery.length).fill(null));

        setRole(profile.role);

        const languageSelection: Record<string, boolean> = {
          English: false,
          Swahili: false,
          French: false,
          Spanish: false,
          German: false,
        };
        if (Array.isArray(profile.languages)) {
          profile.languages.forEach((lang: string) => {
            if (lang in languageSelection) {
              languageSelection[lang] = true;
            }
          });
        }

        const finalData: UpdatedProfileData = {
          ...initialProfileData,
          ...mappedProfile,
          gallery,
          video: mappedProfile.video || '',
          languages: languageSelection,
          pricing: mappedProfile.pricing || { privateSession: 0, groupSession: 0, lecture: 0, workshop: 0 },
          experienceLevel: mappedProfile.experienceLevel || '',
          teachingStyle: mappedProfile.description?.teachingStyle || [],
          ageGroup: mappedProfile.ageGroup || [],
          bio: mappedProfile.description?.bio || '',
          expertise: mappedProfile.description?.expertise || [],
          category: mappedProfile.category || '',
        };

        setUpdatedData(finalData);
        setInitialData(finalData);
        setProfile(mappedProfile);
      } catch (error) {
        console.error('Fetch Profile Error:', error);
        toast.error('Failed to load profile.');
      }
    };

    fetchProfile();
  }, [backendUrl, token]);

  // Fetch available profiles for recommendations.
  useEffect(() => {
    if (!token || !backendUrl) return;

    const fetchProfiles = async () => {
      try {
        const data = await fetchAvailableProfiles(backendUrl, token);
        if (data.success && Array.isArray(data.profiles)) {
          setAvailableProfiles(data.profiles);
        } else {
          toast.error('Failed to load profiles data.');
        }
      } catch (error) {
        toast.error('Unable to load profiles.');
      }
    };

    fetchProfiles();
  }, [backendUrl, token]);

  const isDataChanged = (newData: UpdatedProfileData, originalData: UpdatedProfileData | null): boolean =>
    JSON.stringify(newData) !== JSON.stringify(originalData);

  // Unified API functions accepting union types.
  const handleInputChange = (
    field: string,
    input: string | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const value = extractValue(input);
    setUpdatedData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = (
    input: string | React.ChangeEvent<HTMLInputElement>
  ): void => {
    const searchTerm = extractValue(input).toLowerCase();
    const results = availableProfiles.filter((profile) =>
      profile.name.toLowerCase().includes(searchTerm)
    );
    setSearchResults(results);
  };

  const handlePricingChange = (
    field: string,
    input: string | React.ChangeEvent<HTMLInputElement>
  ): void => {
    const value = extractValue(input);
    setUpdatedData((prev) => ({
      ...prev,
      pricing: { ...prev.pricing, [field]: Number(value) },
    }));
  };

  const handlePaymentMethodChange = (
    input: string | React.ChangeEvent<HTMLSelectElement>
  ): void => {
    const value = extractValue(input);
    setUpdatedData((prev) => ({
      ...prev,
      paymentMethod: value as 'bank' | 'mpesa',
      bankAccount: value === 'bank' ? prev.bankAccount || '' : '',
      bankCode: value === 'bank' ? prev.bankCode || '' : '',
      mpesaPhoneNumber: value === 'mpesa' ? prev.mpesaPhoneNumber || '' : '',
    }));
  };

  const handlePaymentDetailsChange = (
    field: string,
    input: string | React.ChangeEvent<HTMLInputElement>
  ): void => {
    const value = extractValue(input);
    setUpdatedData((prev) => ({ ...prev, [field]: value }));
  };

  // Plain string functions.
  const handleLanguageSelect = (language: string): void => {
    setUpdatedData((prev) => ({
      ...prev,
      languages: { ...prev.languages, [language]: !prev.languages[language] },
    }));
  };

  const handleAddRecommendation = (profileId: string): void => {
    setUpdatedData((prev) => ({
      ...prev,
      recommended: [...prev.recommended, profileId],
    }));
  };

  const handleRemoveRecommendation = (profileId: string): void => {
    setUpdatedData((prev) => ({
      ...prev,
      recommended: prev.recommended.filter((id) => id !== profileId),
    }));
  };

  const handleAgeGroupSelect = (group: string): void => {
    setUpdatedData((prev) => ({
      ...prev,
      ageGroup: prev.ageGroup.includes(group)
        ? prev.ageGroup.filter((item) => item !== group)
        : [...prev.ageGroup, group],
    }));
  };

  const handleTeachingStyleSelect = (style: string): void => {
    setUpdatedData((prev) => {
      const teachingStyles = [...prev.teachingStyle];
      return teachingStyles.includes(style)
        ? { ...prev, teachingStyle: teachingStyles.filter((item) => item !== style) }
        : { ...prev, teachingStyle: [...teachingStyles, style] };
    });
  };

  // File change function.
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    type: 'image' | 'video' = 'image'
  ): void => {
    const target = e.target as unknown as InputWithFiles;
    const file = target.files ? target.files[0] : null;
    if (file) {
      if (type === 'image') {
        const updatedGallery: GalleryImage[] = [...updatedData.gallery];
        updatedGallery[index] = file;
        setUpdatedData((prev) => ({ ...prev, gallery: updatedGallery }));
      } else {
        setUpdatedData((prev) => ({ ...prev, video: file }));
      }
    }
  };

  const handleDeleteImage = async (index: number): Promise<void> => {
    try {
      const imageUrl = updatedData.gallery[index];
      if (!profile?.id) return;
      await deleteGalleryImage(backendUrl!, token!, profile.id, imageUrl as string);
      setUpdatedData((prev) => {
        const updatedGallery = [...prev.gallery];
        updatedGallery[index] = null;
        return { ...prev, gallery: updatedGallery };
      });
      toast.success('Image deleted successfully.');
    } catch (error) {
      toast.error('Failed to delete image.');
    }
  };

  const handleDeleteVideo = async (): Promise<void> => {
    try {
      if (!profile?.id) return;
      await deleteVideo(backendUrl!, token!, profile.id, updatedData.video as string);
      setUpdatedData((prev) => ({ ...prev, video: '' }));
      toast.success('Video deleted successfully.');
    } catch (error) {
      toast.error('Failed to delete video.');
    }
  };

  const handleToggleNotifications = (): void => {
    setUpdatedData((prev) => ({ ...prev, notifications: !prev.notifications }));
  };

  const handleSubmit = async (e?: string | React.FormEvent): Promise<void> => {
    if (e && typeof e !== 'string' && 'preventDefault' in e) {
      e.preventDefault();
    }
    if (!isDataChanged(updatedData, initialData)) {
      toast.info('No changes detected');
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('name', updatedData.name || '');
    formData.append('age', String(updatedData.age || ''));
    formData.append(
      'languages',
      JSON.stringify(
        Object.keys(updatedData.languages).filter((lang) => updatedData.languages[lang])
      )
    );
    formData.append('ageGroup', JSON.stringify(updatedData.ageGroup || []));
    if (role === 'tutor') {
      formData.append('category', updatedData.category || '');
      formData.append('status', updatedData.status || '');
      formData.append('description.bio', updatedData.bio || '');
      formData.append('description.expertise', JSON.stringify(updatedData.expertise || []));
      formData.append('description.teachingStyle', JSON.stringify(updatedData.teachingStyle || []));
      formData.append('pricing', JSON.stringify(updatedData.pricing || {}));
      formData.append('experienceLevel', updatedData.experienceLevel || '');
      if (Array.isArray(updatedData.recommended)) {
        formData.append('recommended', JSON.stringify(updatedData.recommended));
      }
      formData.append('paymentMethod', updatedData.paymentMethod || '');
      if (updatedData.paymentMethod === 'bank') {
        formData.append('bankAccount', updatedData.bankAccount || '');
        formData.append('bankCode', updatedData.bankCode || '');
      } else if (updatedData.paymentMethod === 'mpesa') {
        formData.append('mpesaPhoneNumber', updatedData.mpesaPhoneNumber || '');
      }
      if (updatedData.gallery) {
        updatedData.gallery.forEach((image: GalleryImage, index: number) => {
          if (image instanceof File) {
            formData.append(`image${index + 1}`, image);
          }
        });
      }
      if (updatedData.video instanceof File) {
        formData.append('video', updatedData.video);
      }
    }
    try {
      const response = await updateProfile(backendUrl!, token!, formData);
      if (response.status === 200) {
        toast.success('Profile updated successfully!');
        setInitialData(updatedData);
        refreshProfile?.();
        navigate('/settings');
      }
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'response' in error) {
        const err = error as { response?: { data?: { message?: string } } };
        toast.error(err.response?.data?.message || 'Failed to update profile.');
      } else {
        toast.error('Failed to update profile.');
      }
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
    handleFileChange,
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
