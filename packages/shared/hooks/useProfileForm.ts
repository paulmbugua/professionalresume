// /packages/shared/hooks/useProfileForm.ts
import { useState, useEffect } from 'react';
import { fetchUserRole, createProfile } from '@mytutorapp/shared/api';
import { useShopContext } from '@mytutorapp/shared/context';
import axios from 'axios';
import { toast } from 'react-toastify';



export interface UseProfileFormOptions {
  onSuccess?: () => void;
  token?: string;
  notify?: (message: string, type?: 'success' | 'error') => void;
}

const useProfileForm = (options?: UseProfileFormOptions) => {
  const { onSuccess, token: tokenProp, notify } = options || {};
 
  const { refreshProfile, backendUrl } = useShopContext();

  // Token handling: use the provided token or try to load from localStorage if available.
  const [token, setToken] = useState<string>(tokenProp || '');
  useEffect(() => {
    if (!token && typeof window !== 'undefined') {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
      }
    }
  }, [token]);

  // Fetch the user's role once the token is available.
  const [role, setRole] = useState<string>('');
  useEffect(() => {
    if (token) {
      fetchUserRole(backendUrl, token)
        .then(fetchedRole => setRole(fetchedRole))
        .catch(() => {
          notify && notify("Error fetching user role", "error");
        });
    }
  }, [token, backendUrl, notify]);

  // -- Form state --
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
  const [paymentMethod, setPaymentMethod] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [images, setImages] = useState<(File | null)[]>([null, null, null, null]);
  const [video, setVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // -- Handlers --
  const handleLanguageSelect = (language: string) => {
    setLanguages(prev => ({ ...prev, [language]: !prev[language] }));
  };

  const handleAgeGroupChange = (value: string) => {
    setAgeGroup(prev =>
      prev.includes(value) ? prev.filter(item => item !== value) : [...prev, value]
    );
  };

  const handleVideoChange = (file: File) => {
    setVideo(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleRemoveVideo = () => {
    setVideo(null);
    setVideoPreview(null);
  };

  const handlePricingChange = (field: keyof typeof pricing, value: string) => {
    setPricing(prev => ({ ...prev, [field]: value }));
  };

  // -- Submit Handler --
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert selected languages into an array.
      const selectedLanguages = Object.keys(languages).filter(
        lang => languages[lang as keyof typeof languages]
      );
      const formData = new FormData();
      formData.append("role", role);
      formData.append("name", name.trim());
      formData.append("age", age);
      formData.append("languages", JSON.stringify(selectedLanguages));

      if (role === "student") {
        formData.append("ageGroup", JSON.stringify(ageGroup));
      } else if (role === "tutor") {
        formData.append("category", category || "");
        formData.append("description.bio", bio);
        formData.append("description.expertise", JSON.stringify(expertise));
        formData.append("description.teachingStyle", JSON.stringify(teachingStyle));
        formData.append("pricing", JSON.stringify(pricing));

        if (!paymentMethod) {
          notify && notify("Please select a payment method.", "error");
          setLoading(false);
          return;
        }
        formData.append("paymentMethod", paymentMethod);

        if (paymentMethod === "bank") {
          if (!bankAccount || !bankCode) {
            notify && notify("Please provide both Bank Account Number and Bank Code.", "error");
            setLoading(false);
            return;
          }
          formData.append("bankAccount", bankAccount);
          formData.append("bankCode", bankCode);
        }

        if (paymentMethod === "mpesa") {
          if (!mpesaPhoneNumber) {
            notify && notify("Please provide your M-Pesa phone number.", "error");
            setLoading(false);
            return;
          }
          let formattedPhoneNumber = mpesaPhoneNumber.trim();
          if (formattedPhoneNumber.startsWith("0")) {
            formattedPhoneNumber = `+254${formattedPhoneNumber.slice(1)}`;
          }
          formData.append("mpesaPhoneNumber", formattedPhoneNumber);
        }

        // Append images for gallery.
        const validImages = images.filter((img) => img !== null);
        if (validImages.length === 0) {
          throw new Error("Gallery must contain at least one image for tutors.");
        }
        validImages.forEach((img, index) => {
          if (img) formData.append(`image${index + 1}`, img);
        });

        if (video) {
          formData.append("video", video);
        }
      }

      // Submit profile creation request.
      const response = await createProfile(backendUrl, token, formData);
      if (response.status === 201) {
        notify && notify("Profile created successfully!", "success");
        refreshProfile && refreshProfile();
        onSuccess && onSuccess();
      } else {
        notify && notify("Failed to create profile.", "error");
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Something went wrong');
      } else {
        toast.error('An unexpected error occurred.');
      }
    }
    
  };

  return {
    role,
    token,
    name, setName,
    age, setAge,
    languages,
    handleLanguageSelect,
    ageGroup,
    handleAgeGroupChange,
    category, setCategory,
    bio, setBio,
    expertise, setExpertise,
    teachingStyle, setTeachingStyle,
    pricing,
    handlePricingChange,
    paymentMethod, setPaymentMethod,
    bankAccount, setBankAccount,
    bankCode, setBankCode,
    mpesaPhoneNumber, setMpesaPhoneNumber,
    images, setImages,
    video,
    videoPreview,
    handleVideoChange,
    handleRemoveVideo,
    loading,
    handleSubmit,
  };
};

export default useProfileForm;
