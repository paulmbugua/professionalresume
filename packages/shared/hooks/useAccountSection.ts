// packages/shared/hooks/useAccountSection.ts
import { useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';
import { useSafeRoute, useSafeNavigate } from '../utils/navigation';
import { ShopContext } from '../context/ShopContext';
import {
  fetchUserDetails,
  fetchProfileDetails,
  fetchTransactions,
  fetchDataByType,
  createSession,
  acceptSession,
  cancelSession,
  completePendingSession,
  confirmSessionCompletion,
  submitReview,
  createZoomLink,
} from '../api/accountApi';

// Define a User interface with all required properties.
interface User {
  userId?: string;
  email: string | null;
  tokens: number;
  name?: string;
  profileImage?: string;
  role?: string;
}

// Define a type for the session creation form data.
interface FormData {
  tutorId: string;
  subject: string;
  date: string;
  comment: string;
  rating: string;
  sessionType: string;
  sessionCost: string;
  tutorName?: string;
  pricing: Record<string, number>;
}

export const useAccountSection = () => {
  const {
    token,
    backendUrl,
    tokens,
    userEmail,
    setTokens,
    refreshUserDetails,
    setTokenBalance,
  } = useContext(ShopContext)!;
  const navigate = useSafeNavigate();
  const location = useSafeRoute();

  // Conditionally parse query parameters:
  let queryParams: any;
  if (Platform.OS === 'web') {
    // For web, location is a URLLocation with a search property.
    queryParams = new URLSearchParams((location as any).search);
  } else {
    // For mobile, assume location is from react-navigation and has params.
    queryParams = (location as any).params || {};
  }

  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User>({ email: userEmail, tokens });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accountDetails, setAccountDetails] = useState<any>({});
  const [role, setRole] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<FormData>({
    tutorId: '',
    subject: '',
    date: '',
    comment: '',
    rating: '',
    sessionType: '',
    sessionCost: '',
    pricing: {},
  });
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false);
  const [ratingData, setRatingData] = useState<{ tutorId: string; sessionId: string; rating: string; comment: string; }>({
    tutorId: '',
    sessionId: '',
    rating: '',
    comment: '',
  });

  // Function to update the cancellation reason for a given session.
  const handleCancelReasonChange = (sessionId: string, reason: string) => {
    setCancelReasons((prev: Record<string, string>) => ({ ...prev, [sessionId]: reason }));
  };

  // Function to prompt the user and then cancel a session.
  const confirmCancelSession = (sessionId: string, role: string, status: string) => {
    if (window.confirm('Are you sure you want to cancel this session?')) {
      handleCancelSession(sessionId);
    }
  };

  // Fetch account info (user details & profile)
  const fetchAccountInfo = async () => {
    try {
      if (!token) return;
      const userData = await fetchUserDetails(backendUrl, token);
      const profileData = await fetchProfileDetails(backendUrl, token);
      setUser({
        userId: userData.userId,
        email: userData.email,
        name: profileData.profileExists ? profileData.profile.name || 'Guest' : userData.name || 'Guest',
        profileImage: profileData.profileExists
          ? profileData.profile.gallery?.[0] || '/default-avatar.jpg'
          : '/default-avatar.jpg',
        tokens: userData.tokens || 0,
        role: profileData.profileExists ? profileData.profile.role : null,
      });
      setRole(profileData.profileExists ? profileData.profile.role : '');
    } catch (error) {
      console.error('Error fetching account info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTransactions = async () => {
    try {
      const data = await fetchTransactions(backendUrl, token);
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const updateTokenBalance = async () => {
    try {
      const userData = await fetchUserDetails(backendUrl, token);
      if (userData.tokens !== undefined) {
        setTokens(userData.tokens);
        setTokenBalance(userData.tokens);
        setUser((prev: User) => ({ ...prev, tokens: userData.tokens }));
      }
    } catch (error) {
      console.error('Error updating token balance:', error);
    }
  };

  const fetchDataByTypeHandler = async (type: string) => {
    try {
      const data = await fetchDataByType(backendUrl, token, type);
      setAccountDetails((prev: any) => ({
        ...prev,
        [type]: data || [],
      }));
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error);
    }
  };

  const handleSessionCreation = async () => {
    try {
      const { tutorId, subject, sessionType, sessionCost, date } = formData;
      await createSession(backendUrl, token, { tutorId, subject, sessionType, sessionCost, date });
      alert('Session created successfully.');
      fetchDataByTypeHandler('session');
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleAcceptSession = async (sessionId: string) => {
    try {
      await acceptSession(backendUrl, token, sessionId);
      alert('Session accepted successfully.');
      fetchDataByTypeHandler('session');
    } catch (error) {
      console.error('Error accepting session:', error);
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    const reason = cancelReasons[sessionId] || '';
    if (!reason.trim()) {
      alert('Please provide a reason for cancellation.');
      return;
    }
    try {
      await cancelSession(backendUrl, token, sessionId, reason);
      alert('Session cancelled successfully.');
      fetchDataByTypeHandler('session');
    } catch (error) {
      console.error('Error cancelling session:', error);
    }
  };

  const handleCompletePending = async (sessionId: string) => {
    try {
      const response = await completePendingSession(backendUrl, token, sessionId);
      alert(response.message || 'Session marked as complete-pending.');
      setAccountDetails((prev: any) => ({
        ...prev,
        session: prev.session?.map((s: any) =>
          s.id === sessionId ? { ...s, status: 'completed_pending' } : s
        ),
      }));
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Unknown error';
      console.error('Error marking session as complete-pending:', errorMessage);
      alert(errorMessage);
    }
  };

  const handleConfirmComplete = async (sessionId: string) => {
    try {
      const response = await confirmSessionCompletion(backendUrl, token, sessionId);
      if (!response || !response.session) {
        alert('Session confirmation failed: No session data returned.');
        return;
      }
      alert('Session confirmed as complete.');
      setAccountDetails((prev: any) => ({
        ...prev,
        session: prev.session?.map((s: any) =>
          s.id === sessionId ? { ...s, status: response.session.status } : s
        ),
      }));
      const tutorIdForRating =
        response.session.tutorId ||
        response.session.tutor_id ||
        response.session.tutor_user_id ||
        '';
      setRatingData({ tutorId: tutorIdForRating, sessionId, rating: '', comment: '' });
      setShowRatingModal(true);
    } catch (error) {
      console.error('Error confirming session completion:', error);
    }
  };

  const handleReviewSubmission = async () => {
    try {
      const { tutorId, comment, rating } = ratingData;
      await submitReview(backendUrl, token, { tutorId: String(tutorId), comment, rating: Number(rating) });
      alert('Review submitted successfully.');
      setShowRatingModal(false);
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  const handleCreateZoomLink = async (
    sessionId: string,
    topic: string,
    startTime: string,
    duration: number,
    tutorName: string
  ) => {
    if (!sessionId || !topic || !startTime || !duration || !tutorName) {
      alert('Missing session data for Zoom link creation');
      return;
    }
    try {
      const response = await createZoomLink(backendUrl, token, { sessionId, topic, startTime, duration, tutorName });
      setAccountDetails((prev: any) => ({
        ...prev,
        session: prev.session?.map((s: any) =>
          s.id === sessionId ? { ...s, zoom_links: response.zoomLinks } : s
        ),
      }));
      alert('Zoom link created successfully!');
    } catch (error) {
      console.error('Error creating Zoom links:', error);
    }
  };

  // Initial data fetches
  useEffect(() => {
    if (token) {
      refreshUserDetails();
      fetchAccountInfo();
      fetchUserTransactions();
      updateTokenBalance();
    }
  }, [token, backendUrl]);

  // Handle query parameters for session creation
  useEffect(() => {
    let action, tutorId, tutorName, subject, pricing;
    if (Platform.OS === 'web') {
      action = queryParams.get('action');
      tutorId = queryParams.get('tutorId');
      tutorName = queryParams.get('tutorName');
      subject = queryParams.get('subject');
      pricing = queryParams.get('pricing') ? JSON.parse(queryParams.get('pricing')!) : {};
    } else {
      action = queryParams.action;
      tutorId = queryParams.tutorId;
      tutorName = queryParams.tutorName;
      subject = queryParams.subject;
      pricing = queryParams.pricing || {};
    }
    if (action === 'createSession') {
      setActiveTab('sessions');
      const today = new Date().toISOString().split('T')[0];
      setFormData((prev: FormData) => ({
        ...prev,
        tutorId: tutorId || '',
        tutorName: tutorName || '',
        subject: subject || '',
        pricing: pricing,
        date: today,
      }));
    }
  }, [token, backendUrl, Platform.OS === 'web' ? (location as any).search : (location as any).params]);

  // Role-based data fetching
  useEffect(() => {
    if (role) {
      const typesToFetch =
        role === 'student' ? ['session', 'review'] : role === 'tutor' ? ['session', 'earning'] : [];
      typesToFetch.forEach(fetchDataByTypeHandler);
    }
  }, [role]);

  return {
    loading,
    user,
    transactions,
    accountDetails,
    role,
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    cancelReasons,
    setCancelReasons,
    handleAcceptSession,
    handleCancelSession,
    handleCompletePending,
    handleConfirmComplete,
    handleReviewSubmission,
    setShowRatingModal,
    showRatingModal,
    ratingData,
    setRatingData,
    handleSessionCreation,
    handleCreateZoomLink,
    handleCancelReasonChange,
    confirmCancelSession,
  };
};

export default useAccountSection;
