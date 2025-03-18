// /packages/shared/hooks/useProfileForm.ts
import { useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { fetchUserRole, createProfile } from '../api/profileApi';
import { toast } from 'react-toastify';
import { ShopContext } from '../context/ShopContext';
import { getBackendUrl } from "../utils/env";

export const useProfileForm = (onSuccess?: () => void) => {
  // Backend URL from Vite environment
  const backendUrl = getBackendUrl();
  // Refresh profile function provided by ShopContext
  const { refreshProfile } = useContext(ShopContext) ?? { refreshProfile: () => {} };

  // Token handling – web uses localStorage
  const [token, setToken] = useState<string>('');
  useEffect(() => {
    if (Platform.OS === 'web') {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
      }
    } else {
      // For native, load token from AsyncStorage or context.
    }
  }, []);

  // Fetch the user's role once the token is available.
  const [role, setRole] = useState<string>('');
  useEffect(() => {
    if (token) {
      fetchUserRole(backendUrl, token)
        .then(fetchedRole => setRole(fetchedRole))
        .catch(() => {
          toast.error("Error fetching user role");
        });
    }
  }, [token, backendUrl]);

  // -- Form state --
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  // Updated languages state with an index signature:
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

  // Use keying on pricing fields using the keys of the pricing object.
  const handlePricingChange = (field: keyof typeof pricing, value: string) => {
    setPricing(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // -- Submit Handler --
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert selected languages (object keys where value is true) into an array.
      const selectedLanguages = Object.keys(languages).filter(
        (lang) => languages[lang as keyof typeof languages]
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
          toast.error("Please select a payment method.");
          setLoading(false);
          return;
        }
        formData.append("paymentMethod", paymentMethod);

        if (paymentMethod === "bank") {
          if (!bankAccount || !bankCode) {
            toast.error("Please provide both Bank Account Number and Bank Code.");
            setLoading(false);
            return;
          }
          formData.append("bankAccount", bankAccount);
          formData.append("bankCode", bankCode);
        }

        if (paymentMethod === "mpesa") {
          if (!mpesaPhoneNumber) {
            toast.error("Please provide your M-Pesa phone number.");
            setLoading(false);
            return;
          }
          let formattedPhoneNumber = mpesaPhoneNumber.trim();
          if (formattedPhoneNumber.startsWith("0")) {
            formattedPhoneNumber = `+254${formattedPhoneNumber.slice(1)}`;
          }
          formData.append("mpesaPhoneNumber", formattedPhoneNumber);
        }

        // Append images for gallery (required for tutors)
        const validImages = images.filter(Boolean);
        if (validImages.length === 0) {
          throw new Error("Gallery must contain at least one image for tutors.");
        }
        validImages.forEach((image, index) => {
          if (image) formData.append(`image${index + 1}`, image);
        });

        if (video) {
          formData.append("video", video);
        }
      }

      // Debug: log FormData (casting formData as any to access entries)
      for (let [key, value] of (formData as any).entries()) {
        console.log(`${key}: ${value}`);
      }

      const response = await createProfile(backendUrl, token, formData);
      if (response.status === 201) {
        toast.success("Profile created successfully!");
        refreshProfile && refreshProfile();
        if (onSuccess) onSuccess();
      } else {
        toast.error("Failed to create profile.");
      }
    } catch (error: any) {
      console.error("Error creating profile:", error.response?.data || error.message);
      toast.error(
        error.response?.data?.message ||
          "An error occurred while creating the profile."
      );
    } finally {
      setLoading(false);
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
