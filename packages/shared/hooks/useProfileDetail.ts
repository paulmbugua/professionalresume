// packages/shared/hooks/useProfileDetail.ts
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { useShopContext, useChatContext } from '@mytutorapp/shared/context';
import { getTutorProfile } from '@mytutorapp/shared/api/profileDetailApi';
import type { Pricing } from '@mytutorapp/shared/types';
import type { ChatMessage, Profile } from '@mytutorapp/shared/types/ShopContextTypes';

export interface TutorDescription {
  bio?: string;
  expertise?: string[];
  teachingStyle?: string[];
}

export interface LocalTutorProfile {
  id: string;
  user: string;
  name: string;
  pricing: Pricing;
  category?: string;
  gallery?: string[];
  video?: string;
  role?: string;
  status?: string;
  lastOnline?: string;
  description?: TutorDescription;
  recommended?: LocalTutorProfile[];
  languages?: string[];
}

interface UseProfileDetailReturn {
  tutorProfile: LocalTutorProfile | null;
  loading: boolean;
  showChat: boolean;
  newMessage: string;
  setNewMessage: (msg: string) => void;
  toggleChat: () => void;
  handleCreateSession: (navigateFn: (route: string, params?: Record<string, unknown>) => void) => void;
  handleSendMessage: () => Promise<void>;
  chatMessages: ChatMessage[];
  selectedImage: string | null;
  handleImageClick: (image: string) => void;
  closeModal: () => void;
  myProfile: Profile | null;
}

interface TutorProfileResponse {
  id: string | number;
  user?: string;
  user_id?: string;
  name: string;
  pricing: Pricing;
  category?: string;
  gallery?: string[];
  video?: string;
  role?: string;
  status?: string;
  lastOnline?: string;
  description?: TutorDescription;
  recommended?: LocalTutorProfile[];
  languages?: string[];
}

const useProfileDetail = (
  tutorId: string,
  backendUrl: string
): UseProfileDetailReturn => {
  const { token, profile: myProfile } = useShopContext();
  const { sendMessage, chats } = useChatContext();

  const [showChat, setShowChat] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const { data: tutorProfile = null, isLoading } = useQuery<LocalTutorProfile | null, Error>({
    queryKey: ['tutorProfile', tutorId],
    queryFn: async () => {
      if (!tutorId) return null;

      try {
        const data = await getTutorProfile(
          backendUrl.replace(/\/$/, ''),
          token || '',
          tutorId
        ) as TutorProfileResponse;

        const rawUser = data.user ?? data.user_id;
        if (rawUser == null) {
          console.error('[useProfileDetail] Missing user data', data);
          toast.error('Incomplete profile data from server.');
          return null;
        }

        return {
          id: String(data.id),
          user: String(rawUser),
          name: data.name,
          pricing: data.pricing,
          category: data.category,
          gallery: data.gallery,
          video: data.video,
          role: data.role,
          status: data.status,
          lastOnline: data.lastOnline,
          description: data.description,
          recommended: data.recommended,
          languages: data.languages,
        };
      } catch (err) {
        const error = err as { response?: { status?: number } };
        if (error.response?.status === 404) {
          toast.error('Tutor profile not found.');
        } else {
          console.error('[useProfileDetail] fetch error', err);
          toast.error('Failed to load profile.');
        }
        return null;
      }
    },
    enabled: !!tutorId,
  });


  const toggleChat = () => setShowChat(prev => !prev);

  const handleCreateSession = (navigateFn: (route: string, params?: Record<string, unknown>) => void) => {
    if (!tutorProfile) return;

    const { user: tutorUserId, name, pricing, category } = tutorProfile;
    if (!tutorUserId || !name || !pricing) {
      toast.error('Incomplete profile data.');
      return;
    }

    const params = {
      action: 'createSession',
      tutorId: tutorUserId,
      tutorName: name,
      subject: category || '',
      pricing,
    };

    if (typeof window !== 'undefined' && window.document) {
      const qp = new URLSearchParams({
        action: params.action,
        tutorId: params.tutorId,
        tutorName: params.tutorName,
        subject: params.subject,
        pricing: JSON.stringify(params.pricing),
      }).toString();
      navigateFn(`/account?${qp}`);
    } else {
      navigateFn('Account', params);
    }
  };

  const handleSendMessage = async () => {
    if (!token) {
      toast.error('You need to be logged in to send messages.');
      return;
    }
    if (!newMessage.trim() || !tutorProfile) {
      toast.error("Message content can't be empty.");
      return;
    }

    await sendMessage(tutorProfile.id, newMessage.trim());
    setNewMessage('');
    setShowChat(false);
  };

  const chatMessages: ChatMessage[] =
    chats.find(c => String(c.recipientId) === String(tutorProfile?.id))?.messages ?? [];

  const handleImageClick = (image: string) => setSelectedImage(image);
  const closeModal = () => setSelectedImage(null);

  return {
    tutorProfile,
    loading: isLoading,
    showChat,
    newMessage,
    setNewMessage,
    toggleChat,
    handleCreateSession,
    handleSendMessage,
    chatMessages,
    selectedImage,
    handleImageClick,
    closeModal,
    myProfile,
  };
};

export default useProfileDetail;