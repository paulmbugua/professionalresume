// packages/shared/hooks/useAccountSection.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  EarningType
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

  // Stabilize all state setters
  const setActiveTab = useCallback((tab: string) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  }, []);

  const setFormData = useCallback((data: Partial<FormData>) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...data },
    }));
  }, []);

  const setRatingData = useCallback((data: Partial<RatingFormData>) => {
    setState(prev => ({
      ...prev,
      ratingData: { ...prev.ratingData, ...data },
    }));
  }, []);

  const setShowRatingModal = useCallback((value: boolean) => {
    setState(prev => ({ ...prev, showRatingModal: value }));
  }, []);

  // React Query Definitions
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

  const tokenBalanceQueryOptions: UseQueryOptions<number, AxiosError> = {
    queryKey: ['tokenBalance', token] as QueryKey,
    queryFn: () => accountApi.fetchUpdatedTokenBalance(backendUrl!, token!),
    enabled: !!token,
  };

  const { isError: isTokenBalanceError } = useQuery(tokenBalanceQueryOptions);

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

  // Effect Hooks for Query Side Effects
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

  // Memoize derived session data
  const mappedSessions = useMemo<SessionType[]>(() => {
  return sessions.map((session): SessionType => ({
    id:            String(session.id),
    tutor_name:    String(session.tutorName ?? ''),
    student_name:  String(session.studentName ?? ''),
    student_id:    String(session.studentUser ?? session.student_id ?? ''),
    sessionType:   String(session.session_type),
    amount:        Number(session.amount),
    date:          String(session.date),
    status:        String(session.status),
    zoom_links:    Array.isArray(session.zoom_links)
                     ? session.zoom_links.map(String)
                     : [],
    total_duration:
      typeof session.total_duration === 'number'
        ? session.total_duration
        : Number(session.total_duration) || 0,
    // ← no tutorUser
  }));
}, [sessions]);

 const mappedEarnings = useMemo<EarningType[]>(() => {
  // Pull the raw “earning” field off the profile
  const raw = accountData?.profile.profile.earning;

  // If it isn’t an array, return an empty list
  if (!Array.isArray(raw)) {
    return [];
  }

  // Now narrow & coerce each item into a bona-fide EarningType
  return raw.map(item => {
    // TS now knows item is unknown, so we cast to Partial<EarningType>
    const e = item as Partial<EarningType>;

    return {
      id:          String(e.id ?? ''),                // ensure string
      amount:      typeof e.amount === 'number'       // ensure number
                     ? e.amount
                     : Number(e.amount) || 0,
      description: typeof e.description === 'string'  // ensure string
                     ? e.description
                     : String(e.description ?? ''),
      createdAt:   typeof e.createdAt === 'string'
                     ? e.createdAt
                     : String(e.createdAt ?? ''),
    };
  });
}, [accountData]);

  // Update state when data changes
  
  

  // Query Params Effect
  useEffect(() => {
    if (queryParams?.get('action') === 'createSession') {
      setState(prev => ({
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

  // Mutations (stabilized with useCallback)
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

      setState(prev => ({
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
      setState(prev => ({
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

  // Handler functions (all stabilized with useCallback)
  const handleCancelReasonChange = useCallback((sessionId: string, reason: string) => {
    setState(prev => ({
      ...prev,
      cancelReasons: { ...prev.cancelReasons, [sessionId]: reason },
    }));
  }, []);

  const confirmCancelSession = useCallback(async (
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
  }, [state.cancelReasons, alertFn, confirmFn]);

  const handleAcceptSession = useCallback((sessionId: string) => {
    acceptSessionMutation.mutate(sessionId);
  }, []);

  const handleSessionCreation = useCallback(() => {
    const { tutorName, pricing, ...payload } = state.formData;
    createSessionMutation.mutate(payload as unknown as FormData);
  }, [state.formData]);

  const handleCompletePending = useCallback((sessionId: string) => {
    completePendingMutation.mutate(sessionId);
  }, []);

  const handleConfirmComplete = useCallback((sessionId: string) => {
    confirmCompleteMutation.mutate(sessionId);
  }, []);

  const handleReviewSubmission = useCallback(() => {
    const { tutorId, sessionId, comment, rating } = state.ratingData;
    submitReviewMutation.mutate({
      tutorId: String(tutorId),
      sessionId: String(sessionId),
      rating: Number(rating),
      comment: comment.trim() || '',
    });
  }, [state.ratingData]);

  const handleCreateZoomLink = useCallback((
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
  }, []);

  // Return stabilized object
  return useMemo(() => ({
    ...state,
    sessions: mappedSessions,
    earnings: mappedEarnings,
    loading: isAccountLoading || isTransactionsLoading || isSessionsLoading,
    setActiveTab,
    setFormData,
    setRatingData,
    handleCancelReasonChange,
    handleCancelSession: confirmCancelSession,
    confirmCancelSession,
    handleAcceptSession,
    handleSessionCreation,
    handleCompletePending,
    handleConfirmComplete,
    handleReviewSubmission,
    handleCreateZoomLink,
    setShowRatingModal,
  }), [
    state,
    mappedSessions,
    mappedEarnings,
    isAccountLoading,
    isTransactionsLoading,
    isSessionsLoading,
    setActiveTab,
    setFormData,
    setRatingData,
    handleCancelReasonChange,
    confirmCancelSession,
    handleAcceptSession,
    handleSessionCreation,
    handleCompletePending,
    handleConfirmComplete,
    handleReviewSubmission,
    handleCreateZoomLink,
    setShowRatingModal,
  ]);
};

export default useAccountSection;