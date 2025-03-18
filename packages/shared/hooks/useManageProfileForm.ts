// /packages/shared/hooks/useManageProfileForm.ts
import { useState, useEffect, useContext } from 'react';
import { toast } from 'react-toastify';
import {
  fetchMyProfile,
  fetchAvailableProfiles,
  updateProfile,
  deleteGalleryImage,
  deleteVideo,
} from '../api/manageProfileApi';
import { ShopContext } from '../context/ShopContext';
import { useSafeNavigate } from '../utils/navigation';

export const useManageProfileForm = () => {
  const { token, backendUrl, refreshProfile } = useContext(ShopContext) || {};
  const navigate = useSafeNavigate();

  // Local states
  const [profile, setProfile] = useState<any>(null);
  const [role, setRole] = useState(''); // 'tutor' or 'student'
  const [isUploading, setIsUploading] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [availableProfiles, setAvailableProfiles] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Initial updated data state with default values
  const [updatedData, setUpdatedData] = useState<any>({
    name: '',
    age: '',
    bio: '',
    expertise: [],
    approach: '',
    status: 'Offline',
    notifications: false,
    gallery: [null, null, null, null],
    video: '',
    languages: { English: false, Swahili: false, French: false, Spanish: false, German: false },
    pricing: { privateSession: '', groupSession: '', lecture: '', workshop: '' },
    experienceLevel: '',
    teachingStyle: [],
    specialties: '',
    ageGroup: [],
    category: '',
    recommended: [],
    paymentMethod: '',
    bankAccount: '',
    bankCode: '',
    mpesaPhoneNumber: '',
  });

  // Redirect if no token is available
  useEffect(() => {
    if (!token) {
      toast.error('Please log in to manage your profile.');
      navigate('/login');
      return;
    }
  }, [token, navigate]);

  // Fetch profile on mount
  useEffect(() => {
    if (!token || !backendUrl) return;

    const fetchProfile = async () => {
      try {
        const data = await fetchMyProfile(backendUrl, token);
        const { profileExists, profile } = data;

        if (!profileExists || !profile) {
          console.warn('Profile does not exist or is missing.');
          setUpdatedData({ gallery: [null, null, null, null] });
          return;
        }

        if (!Array.isArray(profile.gallery)) {
          console.warn('Gallery is missing or not an array. Defaulting to empty array.');
          profile.gallery = [];
        }

        // --- Map snake_case keys from DB to camelCase ---
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

        const mappedProfile = {
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

        // Ensure gallery has four slots
        const gallery = profile.gallery
          .slice(0, 4)
          .concat(Array(4 - profile.gallery.length).fill(null));
        setRole(profile.role);

        // Map languages array into object format
        const languageSelection = {
          English: false,
          Swahili: false,
          French: false,
          Spanish: false,
          German: false,
        };
        if (Array.isArray(profile.languages)) {
          profile.languages.forEach((lang: string) => {
            if (languageSelection.hasOwnProperty(lang)) {
              languageSelection[lang] = true;
            }
          });
        }

        const finalData = {
          ...updatedData,
          ...mappedProfile,
          gallery,
          video: mappedProfile.video || '',
          languages: languageSelection,
          pricing: mappedProfile.pricing || { privateSession: '', groupSession: '', lecture: '', workshop: '' },
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

  // Fetch available profiles for recommendations
  useEffect(() => {
    if (!token || !backendUrl) return;

    const fetchProfiles = async () => {
      try {
        const data = await fetchAvailableProfiles(backendUrl, token);
        if (data.success && Array.isArray(data.profiles)) {
          setAvailableProfiles(data.profiles);
        } else {
          console.error('Unexpected response format:', data);
          toast.error('Failed to load profiles data.');
        }
      } catch (error) {
        console.error('Failed to fetch profiles:', error);
        toast.error('Unable to load profiles.');
      }
    };

    fetchProfiles();
  }, [backendUrl, token]);

  // Utility to check if data has changed
  const isDataChanged = (newData: any, originalData: any) =>
    JSON.stringify(newData) !== JSON.stringify(originalData);

  // Event Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUpdatedData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleLanguageSelect = (language: string) => {
    setUpdatedData((prev: any) => ({
      ...prev,
      languages: { ...prev.languages, [language]: !prev.languages[language] },
    }));
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value.toLowerCase();
    if (Array.isArray(availableProfiles)) {
      const results = availableProfiles.filter((profile) =>
        profile.name.toLowerCase().includes(searchTerm)
      );
      setSearchResults(results);
    }
  };

  const handleAddRecommendation = (profileId: string) => {
    setUpdatedData((prev: any) => ({
      ...prev,
      recommended: [...prev.recommended, profileId],
    }));
  };

  const handleRemoveRecommendation = (profileId: string) => {
    setUpdatedData((prev: any) => ({
      ...prev,
      recommended: prev.recommended.filter((id: string) => id !== profileId),
    }));
  };

  const handlePricingChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const { value } = e.target;
    setUpdatedData((prev: any) => ({
      ...prev,
      pricing: { ...prev.pricing, [field]: value },
    }));
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
    type: 'image' | 'video' = 'image'
  ) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (file) {
      if (type === 'image') {
        const updatedGallery = [...updatedData.gallery];
        updatedGallery[index] = file;
        setUpdatedData((prev: any) => ({ ...prev, gallery: updatedGallery }));
      } else if (type === 'video') {
        setUpdatedData((prev: any) => ({ ...prev, video: file }));
      }
    }
  };

  const handleDeleteImage = async (index: number) => {
    try {
      const imageUrl = updatedData.gallery[index];
      if (!profile?._id) return;
      await deleteGalleryImage(backendUrl, token, profile._id, imageUrl);
      setUpdatedData((prev: any) => {
        const updatedGallery = [...prev.gallery];
        updatedGallery[index] = null;
        return { ...prev, gallery: updatedGallery };
      });
      toast.success('Image deleted successfully.');
    } catch (error) {
      console.error('Delete Image Error:', error);
      toast.error('Failed to delete image. Please try again.');
    }
  };

  const handleDeleteVideo = async () => {
    try {
      if (!profile?._id) return;
      await deleteVideo(backendUrl, token, profile._id, updatedData.video);
      setUpdatedData((prev: any) => ({ ...prev, video: '' }));
      toast.success('Video deleted successfully.');
    } catch (error) {
      console.error('Delete Video Error:', error);
      toast.error('Failed to delete video. Please try again.');
    }
  };

  const handleToggleNotifications = () => {
    setUpdatedData((prev: any) => ({ ...prev, notifications: !prev.notifications }));
  };

  const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { value } = e.target;
    setUpdatedData((prev: any) => ({
      ...prev,
      paymentMethod: value,
      bankAccount: value === 'bank' ? prev.bankAccount || '' : '',
      bankCode: value === 'bank' ? prev.bankCode || '' : '',
      mpesaPhoneNumber: value === 'mpesa' ? prev.mpesaPhoneNumber || '' : '',
    }));
  };

  const handlePaymentDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUpdatedData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleAgeGroupSelect = (group: string) => {
    setUpdatedData((prev: any) => ({
      ...prev,
      ageGroup: prev.ageGroup.includes(group)
        ? prev.ageGroup.filter((item: string) => item !== group)
        : [...prev.ageGroup, group],
    }));
  };

  const handleTeachingStyleSelect = (style: string) => {
    setUpdatedData((prev: any) => {
      const teachingStyles = [...prev.teachingStyle];
      if (teachingStyles.includes(style)) {
        return { ...prev, teachingStyle: teachingStyles.filter((item) => item !== style) };
      } else {
        return { ...prev, teachingStyle: [...teachingStyles, style] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isDataChanged(updatedData, initialData)) {
      toast.info('No changes detected');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();

    // Append common fields
    formData.append('name', updatedData.name || '');
    formData.append('age', updatedData.age || '');
    formData.append(
      'languages',
      JSON.stringify(
        Object.keys(updatedData.languages).filter((lang) => updatedData.languages[lang])
      )
    );
    formData.append('ageGroup', JSON.stringify(updatedData.ageGroup || []));

    if (role === 'tutor') {
      // Tutor-specific fields
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
      if (updatedData.gallery && updatedData.gallery.length > 0) {
        updatedData.gallery.forEach((image: any, index: number) => {
          if (image instanceof File) {
            formData.append(`image${index + 1}`, image);
          }
        });
      }
      if (updatedData.video instanceof File) {
        formData.append('video', updatedData.video);
      }
    }

    // For debugging: log the form data entries
    for (let [key, value] of (formData as any).entries()) {
      console.log(`${key}: ${value}`);
    }

    try {
      const response = await updateProfile(backendUrl, token, formData);
      if (response.status === 200) {
        toast.success('Profile updated successfully!');
        setInitialData(updatedData);
        refreshProfile && refreshProfile();
        navigate('/settings');
      }
    } catch (error: any) {
      console.error('Update Profile Error:', error.response?.data || error.message);
      toast.error(
        error.response?.data?.message || 'Failed to update profile. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return {
    role,
    updatedData,
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
