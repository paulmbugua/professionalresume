import { AxiosError } from 'axios';
import { useState, useEffect } from 'react';
import { useShopContext } from '@mytutorapp/shared/context';
import * as accountApi from '@mytutorapp/shared/api';
import type {
  FormData,
  RatingFormData,
  AccountDetails,
  Transactions,
} from '@mytutorapp/shared/types';

export interface AccountUser {
  userId?: string;
  email: string | null;
  name?: string;
  profileImage?: string;
  tokens?: number;
  role?: string;
}

export interface AccountSectionState {
  user: AccountUser;
  transactions: Transactions[];
  accountDetails: AccountDetails;
  activeTab: string;
  loading: boolean;
  formData: FormData;
  ratingData: RatingFormData;
  cancelReasons: Record<string, string>;
  role: string;
  showRatingModal: boolean;
}

export interface UseAccountOptions {
  alertFn?: (message: string) => void;
  confirmFn?: (message: string) => Promise<boolean>;
  navigateFn?: (destination: string) => void;
  queryParams?: URLSearchParams;
}

export const useAccountSection = (options?: UseAccountOptions) => {
  const { alertFn, confirmFn, navigateFn, queryParams } = options || {};
  const { token, backendUrl, tokens, userEmail, setTokens, refreshUserDetails } = useShopContext();

  const [state, setState] = useState<AccountSectionState>({
    user: { email: userEmail, tokens },
    transactions: [],
    accountDetails: {} as AccountDetails,
    activeTab: 'overview',
    loading: true,
    formData: {
      tutorId: '',
      tutorName: '',
      subject: '',
      pricing: {},
      date: new Date().toISOString().split('T')[0],
    },
    // Updated to include an 'id' property
    ratingData: { id: '', tutorId: '', sessionId: '', rating: '', comment: '' },
    cancelReasons: {},
    role: '',
    showRatingModal: false,
  });

  const fetchAccountDetails = async () => {
    if (!token) return;
    try {
      const { user, profile } = await accountApi.fetchAccountDetails(backendUrl, token);
      console.log('Fetched account details:', { user, profile });
      const updatedUser: AccountUser = {
        userId: user.userId,
        email: user.email,
        name: profile.profileExists ? profile.profile.name || 'Guest' : user.name || 'Guest',
        profileImage: profile.profileExists
          ? profile.profile.gallery?.[0] || '/default-avatar.jpg'
          : '/default-avatar.jpg',
        tokens: user.tokens || 0,
        role: profile.profileExists && profile.profile.role ? profile.profile.role : '',
      };
      console.log('Updated user:', updatedUser);
      setState((prev) => ({ ...prev, user: updatedUser, role: updatedUser.role || '' }));
    } catch (error) {
      alertFn?.('Failed to load account details.');
      console.error(error);
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  };

  const fetchTransactions = async () => {
    if (!token) return;
    try {
      const transactions = await accountApi.fetchTransactions(backendUrl, token);
      setState((prev) => ({ ...prev, transactions }));
    } catch (error) {
      alertFn?.('Failed to load transactions.');
      console.error(error);
    }
  };

  const fetchUpdatedTokenBalance = async () => {
    if (!token) return;
    try {
      const newBalance = await accountApi.fetchUpdatedTokenBalance(backendUrl, token);
      setTokens(newBalance);
      setState((prev) => ({
        ...prev,
        user: { ...prev.user, tokens: newBalance },
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const fetchSessions = async () => {
    try {
      const sessions = await accountApi.fetchSessionsByType(backendUrl, token, 'session');
      console.log('Fetched sessions:', sessions);
      const mappedSessions = sessions.map((session: any) => ({
        ...session,
        sessionType: session.session_type,
      }));
      console.log('Mapped sessions:', mappedSessions);
      setState((prev) => ({
        ...prev,
        accountDetails: {
          ...prev.accountDetails,
          session: mappedSessions || [],
        },
      }));
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUserDetails();
      fetchAccountDetails();
      fetchTransactions();
      fetchUpdatedTokenBalance();
      fetchSessions();
    }
  }, [token, backendUrl]);

  useEffect(() => {
    if (queryParams?.get('action') === 'createSession') {
      setState((prev) => ({
        ...prev,
        activeTab: 'sessions',
        formData: {
          ...prev.formData,
          tutorId: queryParams.get('tutorId') || '',
          tutorName: queryParams.get('tutorName') || '',
          subject: queryParams.get('subject') || '',
          pricing: queryParams.get('pricing') ? JSON.parse(queryParams.get('pricing')!) : {},
          date: new Date().toISOString().split('T')[0],
        },
      }));
    }
  }, [queryParams]);

  const handleCancelReasonChange = (sessionId: string, reason: string) => {
    setState((prev) => ({
      ...prev,
      cancelReasons: { ...prev.cancelReasons, [sessionId]: reason },
    }));
  };

  const confirmCancelSession = async (sessionId: string, _role: string, _status: string) => {
    if (confirmFn && (await confirmFn('Are you sure you want to cancel this session?'))) {
      await handleCancelSession(sessionId, _role, _status);
    }
  };

  const handleAcceptSession = async (sessionId: string) => {
    try {
      await accountApi.acceptSession(backendUrl, token, sessionId);
      alertFn?.('Session accepted successfully.');
      await fetchSessions();
    } catch {
      alertFn?.('Failed to accept session.');
    }
  };

  const handleCancelSession = async (sessionId: string, role: string, status: string) => {
    const reason = state.cancelReasons[sessionId] || '';
    if (!reason.trim()) {
      alertFn?.('Please provide a reason for cancellation.');
      return;
    }

    if (role === 'tutor' && status === 'pending') {
      alertFn?.('Tutors cannot cancel a pending session.');
      return;
    }

    try {
      await accountApi.cancelSession(backendUrl, token, sessionId, reason);
      alertFn?.('Session cancelled successfully.');
      await fetchSessions();
    } catch {
      alertFn?.('Failed to cancel session.');
    }
  };

  const handleSessionCreation = async () => {
    try {
      const { tutorName, pricing, ...payload } = state.formData;
      await accountApi.createSession(backendUrl, token, payload as unknown as FormData);
      alertFn?.('Session created successfully.');
      await fetchSessions();
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>;
      if (
        err.response?.status === 400 &&
        err.response.data?.message?.includes('Insufficient tokens')
      ) {
        alertFn?.('Insufficient tokens. Please buy more tokens.');
        navigateFn?.('/buy-tokens');
      } else {
        alertFn?.('Failed to create session.');
      }
    }
  };

  const handleCompletePending = async (sessionId: string) => {
    try {
      await accountApi.completePendingSession(backendUrl, token, sessionId);
      alertFn?.('Session marked as complete-pending.');
      await fetchSessions();
    } catch {
      alertFn?.('Failed to mark session as complete-pending.');
    }
  };

  const handleConfirmComplete = async (sessionId: string) => {
    try {
      const response = await accountApi.confirmSessionCompletion(backendUrl, token, sessionId);
      alertFn?.('Session confirmed as complete.');
      await fetchSessions();
      // Updated: include an empty id for ratingData
      setState((prev) => ({
        ...prev,
        ratingData: {
          id: '', // Added `id`
          tutorId: response.session.tutorId || '',
          sessionId,
          rating: '',
          comment: '',
        },
      }));
    } catch {
      alertFn?.('Failed to confirm session completion.');
    }
  };

  const handleReviewSubmission = async () => {
    try {
      const { tutorId, comment, rating } = state.ratingData;
      await accountApi.submitReview(backendUrl, token, {
        tutorId,
        comment,
        rating: Number(rating),
      });
      alertFn?.('Review submitted successfully.');
      // Updated: include id in the reset payload
      setState((prev) => ({
        ...prev,
        ratingData: {
          id: '', // Added `id` property here as well
          tutorId: '',
          sessionId: '',
          rating: '',
          comment: '',
        },
      }));
    } catch {
      alertFn?.('Failed to submit review.');
    }
  };

  const handleCreateZoomLink = async (
    sessionId: string,
    topic: string,
    startTime: string,
    duration: number,
    tutorName: string
  ) => {
    try {
      await accountApi.createZoomLink(
        backendUrl,
        token,
        sessionId,
        topic,
        startTime,
        duration,
        tutorName
      );
      alertFn?.('Zoom link created successfully!');
      await fetchSessions();
    } catch {
      alertFn?.('Failed to create Zoom link.');
    }
  };

  return {
    ...state,
    setActiveTab: (tab: string) => setState((prev) => ({ ...prev, activeTab: tab })),
    setFormData: (data: Partial<FormData>) =>
      setState((prev) => ({ ...prev, formData: { ...prev.formData, ...data } })),
    setRatingData: (data: Partial<RatingFormData>) =>
      setState((prev) => ({ ...prev, ratingData: { ...prev.ratingData, ...data } })),
    handleCancelReasonChange,
    confirmCancelSession,
    handleAcceptSession,
    handleCancelSession,
    handleSessionCreation,
    handleCompletePending,
    handleConfirmComplete,
    handleReviewSubmission,
    handleCreateZoomLink,
    role: state.role,
    showRatingModal: state.showRatingModal,
    setShowRatingModal: (value: boolean) =>
      setState((prev) => ({ ...prev, showRatingModal: value })),
  };
};

export default useAccountSection;
