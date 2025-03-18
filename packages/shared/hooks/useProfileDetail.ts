// /packages/shared/hooks/useProfileDetail.ts
import { useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { useSafeRoute, useSafeNavigate } from '../utils/navigation';
import { toast } from 'react-toastify';
import { ShopContext, ShopContextValue } from '../context/ShopContext';
import { getTutorProfile } from '../api/profileDetailApi';

export const useProfileDetail = () => {
  const safeRoute = useSafeRoute();
  const navigate = useSafeNavigate();

  // Extract the tutor profile id from route.
  let id: string | null = null;
  if (Platform.OS === 'web') {
    const params = new URLSearchParams((safeRoute as any).search);
    id = params.get('id');
  } else {
    id = (safeRoute as any).params?.id;
  }

  // Retrieve ShopContext and throw an error if not provided.
  const shopContext = useContext(ShopContext);
  if (!shopContext) {
    throw new Error("ShopContext is not provided");
  }
  const { token, backendUrl, sendMessage, profile: myProfile, chats } = shopContext as ShopContextValue;

  const [tutorProfile, setTutorProfile] = useState<any>(null);
  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Fetch tutor profile based on URL id
  useEffect(() => {
    if (!id || !token) return;
    const fetchProfile = async () => {
      try {
        const data = await getTutorProfile(backendUrl, token, id);
        if (data) {
          setTutorProfile(data);
        } else {
          toast.error('Failed to load profile.');
        }
      } catch (error) {
        toast.error('An error occurred while fetching profile.');
      }
    };
    fetchProfile();
  }, [backendUrl, id, token]);

  // Handler to toggle chat view
  const toggleChat = () => {
    setShowChat(prev => !prev);
  };

  // Handler to send message
  const handleSendMessage = async () => {
    if (!token) {
      toast.error('You need to be logged in to send messages.');
      return;
    }
    if (newMessage.trim() && tutorProfile) {
      await sendMessage({
        recipientId: String(tutorProfile.id),
        content: newMessage,
      });
      setNewMessage('');
      setShowChat(false);
    } else {
      toast.error("Message content can't be empty.");
    }
  };

  // Handler to initiate a session creation
  const handleCreateSession = () => {
    if (!tutorProfile) {
      console.error("Profile is undefined.");
      return;
    }
    if (!tutorProfile.name) {
      console.error("Tutor name is missing.");
      return;
    }
    if (!tutorProfile.pricing) {
      console.error("Pricing information is missing.");
      return;
    }
    const tutorId = tutorProfile.id;
    if (!tutorId) {
      console.error("Tutor ID is missing from the profile.");
      return;
    }
    const pricingParam = encodeURIComponent(JSON.stringify(tutorProfile.pricing));
    navigate(
      `/account?action=createSession&tutorId=${encodeURIComponent(tutorId)}&tutorName=${encodeURIComponent(
        tutorProfile.name
      )}&subject=${encodeURIComponent(tutorProfile.category)}&pricing=${pricingParam}`
    );
  };

  // Handler for image click to open modal
  const handleImageClick = (image: string) => {
    setSelectedImage(image);
  };

  // Close image modal
  const closeModal = () => {
    setSelectedImage(null);
  };

  // Derive chat messages (if a conversation exists)
  const chatMessages =
    (chats.find((chat) => String(chat.recipientId) === String(tutorProfile?.id))?.messages) || [];

  return {
    tutorProfile,
    showChat,
    toggleChat,
    newMessage,
    setNewMessage,
    handleSendMessage,
    handleCreateSession,
    selectedImage,
    handleImageClick,
    closeModal,
    chatMessages,
    myProfile,
  };
};
