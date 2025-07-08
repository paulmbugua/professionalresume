// packages/shared/hooks/useAccountSection.ts
import { useState, useEffect } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryKey,
  UseQueryOptions,
} from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';
import { useShopContext } from '@mytutorapp/shared/context';
import * as accountApi from '@mytutorapp/shared/api';
import type {
  FormData,
  RatingFormData,
  AccountDetails,
  Transactions,
  Session,
  SessionType,
} from '@mytutorapp/shared/types';

interface AccountResponse {
  user: {
    userId: string;
    email: string;
    name?: string;
    tokens?: number;
  };
  profile: {
    profileExists: boolean;
    profile: AccountDetails & {
      name?: string;
      role?: string;
      gallery?: string[];
    };
  };
}

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

interface ReviewPayload {
  tutorId: string;
  sessionId?: string;
  comment: string;
  rating: number;
}

export const useAccountSection = (options?: UseAccountOptions) => {
  const { alertFn, confirmFn, navigateFn, queryParams } = options || {};
  const {
    token,
    backendUrl,
    tokens,
    userEmail,
    setTokens,
    refreshUserDetails,
  } = useShopContext();
  const queryClient = useQueryClient();

  const [state, setState] = useState<Omit<AccountSectionState, 'loading'>>({
    user: { email: userEmail, tokens },
    transactions: [],
    accountDetails: {} as AccountDetails,
    activeTab: 'overview',
    formData: {
      tutorId: '',
      tutorName: '',
      subject: '',
      pricing: {},
      date: new Date().toISOString().split('T')[0],
    },
    ratingData: { id: '', tutorId: '', sessionId: '', rating: '', comment: '' },
    cancelReasons: {},
    role: '',
    showRatingModal: false,
  });

  // ─── React Query Definitions ─────────────────────────────────────────────────

  // Account Details Query
  const accountQueryOptions: UseQueryOptions<AccountResponse, AxiosError> = {
    queryKey: ['accountDetails', token] as QueryKey,
    queryFn: () => accountApi.fetchAccountDetails(backendUrl!, token!),
    enabled: !!token,
  };

  const {
    data: accountData,
    isLoading: isAccountLoading,
    isError: isAccountError,
  } = useQuery(accountQueryOptions);

  // Transactions Query
  const transactionsQueryOptions: UseQueryOptions<Transactions[], AxiosError> = {
    queryKey: ['transactions', token] as QueryKey,
    queryFn: () => accountApi.fetchTransactions(backendUrl!, token!),
    enabled: !!token,
  };

  const {
    data: transactions = [],
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
  } = useQuery(transactionsQueryOptions);

  // Token Balance Query
  const tokenBalanceQueryOptions: UseQueryOptions<number, AxiosError> = {
    queryKey: ['tokenBalance', token] as QueryKey,
    queryFn: () => accountApi.fetchUpdatedTokenBalance(backendUrl!, token!),
    enabled: !!token,
  };

  const { isError: isTokenBalanceError } = useQuery(tokenBalanceQueryOptions);

  // Sessions Query
  const sessionsQueryOptions: UseQueryOptions<Session[], AxiosError> = {
    queryKey: ['sessions', token] as QueryKey,
    queryFn: () => accountApi.fetchSessionsByType(backendUrl!, token!, 'session'),
    enabled: !!token,
  };

  const {
    data: sessions = [],
    isLoading: isSessionsLoading,
    isError: isSessionsError,
  } = useQuery(sessionsQueryOptions);

  // ─── Effect Hooks for Query Side Effects ────────────────────────────────────

  useEffect(() => {
    if (isAccountError) {
      alertFn?.('Failed to load account details.');
    }
  }, [isAccountError, alertFn]);

  useEffect(() => {
    if (isTransactionsError) {
      alertFn?.('Failed to load transactions.');
    }
  }, [isTransactionsError, alertFn]);

  useEffect(() => {
    if (isTokenBalanceError) {
      console.error('Failed to fetch token balance.');
    }
  }, [isTokenBalanceError]);

  useEffect(() => {
    if (isSessionsError) {
      console.error('Failed to load sessions.');
    }
  }, [isSessionsError]);

  useEffect(() => {
    if (accountData) {
      const updatedUser: AccountUser = {
        userId: accountData.user.userId,
        email: accountData.user.email,
        name: accountData.profile.profileExists
          ? accountData.profile.profile.name || 'Guest'
          : accountData.user.name || 'Guest',
        profileImage: accountData.profile.profileExists
          ? accountData.profile.profile.gallery?.[0] || '/default-avatar.jpg'
          : '/default-avatar.jpg',
        tokens: accountData.user.tokens || 0,
        role:
          accountData.profile.profileExists && accountData.profile.profile.role
            ? accountData.profile.profile.role
            : '',
      };

      setState((prev) => ({
        ...prev,
        user: updatedUser,
        role: updatedUser.role || '',
      }));
    }
  }, [accountData]);

  useEffect(() => {
    if (transactions) {
      setState((prev) => ({ ...prev, transactions }));
    }
  }, [transactions]);

  useEffect(() => {
    if (sessions) {
      const mappedSessions = sessions.map((session: Session) => ({
        id: session.id,
        tutor_name: session.tutorName ?? '',
        student_name: session.studentName ?? '',
        student_id: session.studentUser ?? session.student_id ?? '',
        sessionType: session.session_type,
        amount: session.amount,
        date: session.date,
        status: session.status,
        zoom_links: session.zoom_links,
        total_duration: session.total_duration,
        tutorUser: session.tutorUser ?? session.tutor_user ?? '',
      }));

      setState((prev) => ({
        ...prev,
        accountDetails: {
          ...prev.accountDetails,
          session: mappedSessions as unknown as Session[],
        },
      }));
    }
  }, [sessions]);

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const cancelSessionMutation = useMutation({
    mutationFn: (sessionId: string) =>
      accountApi.cancelSession(
        backendUrl!,
        token!,
        sessionId,
        state.cancelReasons[sessionId] || ''
      ),
    onSuccess: () => {
      alertFn?.('Session cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: ['sessions', token] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      alertFn?.(error.response?.data?.message || 'Failed to cancel session.');
    },
  });

  const acceptSessionMutation = useMutation({
    mutationFn: (id: string) => accountApi.acceptSession(backendUrl!, token!, id),
    onSuccess: () => {
      alertFn?.('Session accepted successfully.');
      queryClient.invalidateQueries({ queryKey: ['sessions', token] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      alertFn?.(error.response?.data?.message || 'Failed to accept session.');
    },
  });

  const createSessionMutation = useMutation({
    mutationFn: (f: FormData) => accountApi.createSession(backendUrl!, token!, f),
    onSuccess: () => {
      alertFn?.('Session created successfully.');
      queryClient.invalidateQueries({ queryKey: ['sessions', token] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      if (
        error.response?.status === 400 &&
        error.response.data?.message?.includes('Insufficient tokens')
      ) {
        alertFn?.('Insufficient tokens. Please buy more tokens.');
        navigateFn?.('/buy-tokens');
      } else {
        alertFn?.(error.response?.data?.message || 'Failed to create session.');
      }
    },
  });

  const completePendingMutation = useMutation({
    mutationFn: (id: string) =>
      accountApi.completePendingSession(backendUrl!, token!, id),
    onSuccess: () => {
      alertFn?.('Session marked as complete-pending.');
      queryClient.invalidateQueries({ queryKey: ['sessions', token] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      alertFn?.(error.response?.data?.message || 'Failed to mark session as complete-pending.');
    },
  });

  const confirmCompleteMutation = useMutation({
    mutationFn: (id: string) =>
      accountApi.confirmSessionCompletion(backendUrl!, token!, id),
    onSuccess: (_, sessionId: string) => {
      alertFn?.('Session confirmed as complete.');
      queryClient.invalidateQueries({ queryKey: ['sessions', token] });

      const sessionArray = Array.isArray(state.accountDetails.session) 
        ? state.accountDetails.session 
        : [];
      
      const completedSession = sessionArray.find(
        (s: Session) => String(s.id) === String(sessionId));
      const payloadTutorId = (completedSession as any)?.tutorUser ?? '';

      setState((prev) => ({
        ...prev,
        ratingData: {
          id: '',
          tutorId: payloadTutorId,
          sessionId,
          rating: '',
          comment: '',
        },
        showRatingModal: true,
      }));
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      alertFn?.(error.response?.data?.message || 'Failed to confirm session completion.');
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: (body: ReviewPayload) => accountApi.submitReview(backendUrl!, token!, body),
    onSuccess: () => {
      alertFn?.('Review submitted successfully.');
      setState((prev) => ({
        ...prev,
        ratingData: { id: '', tutorId: '', sessionId: '', rating: '', comment: '' },
        showRatingModal: false,
      }));
      queryClient.invalidateQueries({ queryKey: ['sessions', token] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      alertFn?.(error.response?.data?.message || 'Failed to submit review.');
    },
  });

  const createZoomLinkMutation = useMutation({
    mutationFn: (params: {
      sessionId: string;
      topic: string;
      startTime: string;
      duration: number;
      tutorName: string;
    }) => accountApi.createZoomLink(
      backendUrl!,
      token!,
      params.sessionId,
      params.topic,
      params.startTime,
      params.duration,
      params.tutorName
    ),
    onSuccess: () => {
      alertFn?.('Zoom link created successfully!');
      queryClient.invalidateQueries({ queryKey: ['sessions', token] });
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      alertFn?.(error.response?.data?.message || 'Failed to create Zoom link.');
    },
  });

  // ─── Effect Hooks ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (token) {
      refreshUserDetails();
    }
  }, [token, refreshUserDetails]);

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
          pricing: queryParams.get('pricing')
            ? JSON.parse(queryParams.get('pricing')!)
            : {},
          date: new Date().toISOString().split('T')[0],
        },
      }));
    }
  }, [queryParams]);

  // ─── Handler Functions ────────────────────────────────────────────────────────

  const handleCancelReasonChange = (sessionId: string, reason: string) => {
    setState((prev) => ({
      ...prev,
      cancelReasons: { ...prev.cancelReasons, [sessionId]: reason },
    }));
  };

  const confirmCancelSession = async (
    sessionId: string,
    role: string,
    status: string
  ) => {
    const reason = state.cancelReasons[sessionId] || '';
    if (!reason.trim()) {
      alertFn?.('Please provide a reason for cancellation.');
      return;
    }
    if (role === 'tutor' && status === 'pending') {
      alertFn?.('Tutors cannot cancel a pending session.');
      return;
    }

    if (confirmFn && (await confirmFn('Are you sure you want to cancel this session?'))) {
      cancelSessionMutation.mutate(sessionId);
    }
  };

  const handleAcceptSession = (sessionId: string) => {
    acceptSessionMutation.mutate(sessionId);
  };

  const handleSessionCreation = () => {
    const { tutorName, pricing, ...payload } = state.formData;
    createSessionMutation.mutate(payload as unknown as FormData);
  };

  const handleCompletePending = (sessionId: string) => {
    completePendingMutation.mutate(sessionId);
  };

  const handleConfirmComplete = (sessionId: string) => {
    confirmCompleteMutation.mutate(sessionId);
  };

  const handleReviewSubmission = () => {
    const { tutorId, sessionId, comment, rating } = state.ratingData;
    submitReviewMutation.mutate({
      tutorId: String(tutorId),
      sessionId: String(sessionId),
      rating: Number(rating),
      comment: comment.trim() || '',
    });
  };

  const handleCreateZoomLink = (
    sessionId: string,
    topic: string,
    startTime: string,
    duration: number,
    tutorName: string
  ) => {
    createZoomLinkMutation.mutate({
      sessionId,
      topic,
      startTime,
      duration,
      tutorName,
    });
  };

  return {
    ...state,
    loading: isAccountLoading || isTransactionsLoading || isSessionsLoading,
    setActiveTab: (tab: string) =>
      setState((prev) => ({ ...prev, activeTab: tab })),
    setFormData: (data: Partial<FormData>) =>
      setState((prev) => ({
        ...prev,
        formData: { ...prev.formData, ...data },
      })),
    setRatingData: (data: Partial<RatingFormData>) =>
      setState((prev) => ({
        ...prev,
        ratingData: { ...prev.ratingData, ...data },
      })),
    handleCancelReasonChange,
    confirmCancelSession,
    handleAcceptSession,
    handleSessionCreation,
    handleCompletePending,
    handleConfirmComplete,
    handleReviewSubmission,
    handleCreateZoomLink,
    setShowRatingModal: (value: boolean) =>
      setState((prev) => ({ ...prev, showRatingModal: value })),
  };
};

export default useAccountSection;