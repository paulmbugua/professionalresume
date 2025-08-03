// packages/shared/hooks/useAccountSection.ts

import { useState, useEffect, useCallback, useRef } from 'react'
import { useShopContext } from '@mytutorapp/shared/context'
import useAppQuery from './useAppQuery'
import { useMutation } from '@tanstack/react-query'
import * as accountApi from '@mytutorapp/shared/api'
import axios from 'axios'
import type {
  FormData,
  RatingFormData,
  Transactions,
  SessionType,
  EarningType,
} from '@mytutorapp/shared/types'

// Strongly-typed UI session
export interface Session {
  id: string
  tutor_name: string
  student_name: string
  student_id: string
  sessionType: string
  subject: string
  amount: number
  date: string
  status: string
  zoom_links: string[]
  total_duration?: number
  tutorUser: string
}

// Earnings come straight through
export interface AccountDetails {
  session: Session[]
  earning: EarningType[]
}

export interface AccountUser {
  userId?: string
  email: string | null
  name?: string
  profileImage?: string
  tokens: number
  role: 'student' | 'tutor'
}

export interface UseAccountOptions {
  alertFn?: (message: string) => void
  confirmFn?: (message: string) => Promise<boolean>
  navigateFn?: (destination: string) => void
  queryParams?: URLSearchParams
}

const isEarningType = (x: unknown): x is EarningType => {
  const e = x as EarningType
  return (
    typeof e.amount === 'number' &&
    typeof e.description === 'string' &&
    typeof e.createdAt === 'string'
  )
}

export const useAccountSection = (options?: UseAccountOptions) => {
  const { alertFn, confirmFn, navigateFn, queryParams } = options ?? {}
  const { token, backendUrl, setTokens } = useShopContext()

  // 1) Fetch account + profile
  const { data: acctResp, isLoading: loadingDetails } = useAppQuery<
    {
      user: { userId: string; email: string; tokens: number }
      profile: {
        profileExists: boolean
        profile: {
          name: string
          gallery: string[]
          role: 'student' | 'tutor'
          earning?: unknown
        }
      }
    },
    Error
  >(
    ['accountDetails', token],
    () => accountApi.fetchAccountDetails(backendUrl, token!),
    { enabled: Boolean(token) }
  )

  const user: AccountUser = {
    userId: acctResp?.user.userId,
    email: acctResp?.user.email ?? null,
    name: acctResp?.profile.profileExists
      ? acctResp.profile.profile.name
      : undefined,
    profileImage: acctResp?.profile.profileExists
      ? acctResp.profile.profile.gallery[0]
      : '/default-avatar.jpg',
    tokens: acctResp?.user.tokens ?? 0,
    role: acctResp?.profile.profile.role ?? 'student',
  }

  // sync tokens back
  const prevTokens = useRef<number>()
  useEffect(() => {
    if (user.tokens !== prevTokens.current) {
      prevTokens.current = user.tokens
      setTokens(user.tokens)
    }
  }, [user.tokens, setTokens])

  // 2) Transactions
  const { data: transactions = [] } = useAppQuery<Transactions[], Error>(
    ['transactions', token],
    () => accountApi.fetchTransactions(backendUrl, token!),
    { enabled: Boolean(token) }
  )

  // 3a) Sessions
  const {
    data: sessionsRaw = [],
    refetch: refetchSessions,
  } = useAppQuery<SessionType[], Error>(
    ['sessions', token],
    () => accountApi.fetchSessionsByType(backendUrl, token!, 'session'),
    { enabled: Boolean(token) }
  )

  const sessions: Session[] = sessionsRaw.map((s) => ({
    id: String(s.id),
    tutor_name: s.tutor_name ?? '',
    student_name: s.student_name ?? '',
    student_id: String(s.student_id),
    sessionType: String(s.sessionType ?? ''),
    subject: String(s.subject ?? ''),
    amount: Number(s.amount),
    date: String(s.date),
    status: String(s.status),
    zoom_links: Array.isArray(s.zoom_links)
      ? s.zoom_links.filter((l): l is string => typeof l === 'string')
      : [],
    total_duration:
      s.total_duration != null ? Number(s.total_duration) : undefined,
    tutorUser: String((s as any).tutorUser ?? ''),
  }))

  // 3b) Earnings
  const rawEarnings = acctResp?.profile.profile.earning ?? []
  const earnings: EarningType[] = Array.isArray(rawEarnings)
    ? rawEarnings.filter(isEarningType)
    : []

  const accountDetails: AccountDetails = {
    session: sessions,
    earning: earnings,
  }

  // 4) Local UI
  const [activeTab, setActiveTab] = useState<
    'overview' | 'transactions' | 'sessions' | 'reviews' | 'earnings'
  >('overview')

  const [formData, setFormData] = useState<FormData>({
    tutorId: '',
    tutorName: '',
    subject: '',
    pricing: {},
    date: new Date().toISOString().slice(0, 10),
  })

  const [ratingData, setRatingData] = useState<RatingFormData>({
    id: '',
    tutorId: '',
    sessionId: '',
    rating: '',
    comment: '',
  })

  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({})
  const [showRatingModal, setShowRatingModal] = useState(false)

  // 5) Mutations
  const cancelSessionM = useMutation<void, Error, { sessionId: string; reason: string }>(
    {
      mutationFn: ({ sessionId, reason }) =>
        accountApi.cancelSession(backendUrl, token!, sessionId, reason),
      onSuccess: () => {
        alertFn?.('Session cancelled successfully.')
        refetchSessions()
      },
      onError: () => alertFn?.('Failed to cancel session.'),
    }
  )

  const acceptSessionM = useMutation<void, Error, string>({
    mutationFn: (sessionId) =>
      accountApi.acceptSession(backendUrl, token!, sessionId),
    onSuccess: () => {
      alertFn?.('Session accepted successfully.')
      refetchSessions()
    },
    onError: () => alertFn?.('Failed to accept session.'),
  })

  const createSessionM = useMutation<void, Error, FormData>({
    mutationFn: (payload) =>
      accountApi.createSession(backendUrl, token!, payload),
    onSuccess: () => {
      alertFn?.('Session created successfully.')
      refetchSessions()
    },
    onError: (err) => {
      if (
        axios.isAxiosError(err) &&
        err.response?.data?.message?.includes('Insufficient tokens')
      ) {
        alertFn?.('Insufficient tokens. Please buy more tokens.')
        navigateFn?.('/buy-tokens')
      } else {
        alertFn?.('Failed to create session.')
      }
    },
  })

  const completePendingM = useMutation<void, Error, string>({
    mutationFn: (sessionId) =>
      accountApi.completePendingSession(backendUrl, token!, sessionId),
    onSuccess: () => {
      alertFn?.('Session marked as complete-pending.')
      refetchSessions()
    },
    onError: () => alertFn?.('Failed to mark complete-pending.'),
  })

  const confirmCompleteM = useMutation<void, Error, string>({
    mutationFn: (sessionId) =>
      accountApi.confirmSessionCompletion(backendUrl, token!, sessionId),
    onSuccess: (_data, sessionId) => {
      alertFn?.('Session confirmed complete.')
      refetchSessions()
      const done = sessions.find((s) => s.id === sessionId)
      if (done) {
        setRatingData({
          id: '',
          tutorId: done.tutorUser,
          sessionId,
          rating: '',
          comment: '',
        })
      }
      setShowRatingModal(true)
    },
    onError: () => alertFn?.('Failed to confirm completion.'),
  })

  type ReviewVars = {
    tutorId: string
    sessionId: string
    rating: number
    comment: string
  }

  const submitReviewM = useMutation<void, Error, ReviewVars>({
    mutationFn: (body) =>
      accountApi.submitReview(backendUrl, token!, body),
    onSuccess: () => {
      alertFn?.('Review submitted.')
      setShowRatingModal(false)
      refetchSessions()
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        console.error('Review submission failed:', err.response?.data)
        alertFn?.(
          err.response?.data?.message ?? 'Failed to submit review.'
        )
      } else {
        alertFn?.('Failed to submit review.')
      }
    },
  })

  const zoomLinkM = useMutation<
    void,
    Error,
    {
      sessionId: string
      topic: string
      startTime: string
      duration: number
      tutorName: string
    }
  >({
    mutationFn: ({
      sessionId,
      topic,
      startTime,
      duration,
      tutorName,
    }) =>
      accountApi.createZoomLink(
        backendUrl,
        token!,
        sessionId,
        topic,
        startTime,
        duration,
        tutorName
      ),
    onSuccess: () => {
      alertFn?.('Zoom link created.')
      refetchSessions()
    },
    onError: () => alertFn?.('Failed to create Zoom link.'),
  })

  // 6) URL‐driven tab logic
  useEffect(() => {
    if (queryParams?.get('action') === 'createSession') {
      setActiveTab('sessions')
      setFormData((fd) => ({
        ...fd,
        tutorId: queryParams.get('tutorId') ?? '',
        tutorName: queryParams.get('tutorName') ?? '',
        subject: queryParams.get('subject') ?? '',
        pricing: queryParams.get('pricing')
          ? JSON.parse(queryParams.get('pricing')!)
          : {},
      }))
    }
  }, [queryParams])

  // 7) Handlers
  const confirmCancelSession = useCallback(
    async (sessionId: string, role: string, status: string) => {
      if (role === 'tutor' && status === 'pending') {
        alertFn?.('Tutors cannot cancel a pending session.')
        return
      }
      if (
        await confirmFn?.(
          'Are you sure you want to cancel this session?'
        )
      ) {
        cancelSessionM.mutate({
          sessionId,
          reason: cancelReasons[sessionId] ?? '',
        })
      }
    },
    [confirmFn, cancelReasons, cancelSessionM, alertFn]
  )

  const handleAcceptSession = useCallback(
    (sessionId: string) => acceptSessionM.mutate(sessionId),
    [acceptSessionM]
  )
  const handleCancelSession = confirmCancelSession

  const handleSessionCreation = useCallback(
    () => createSessionM.mutate(formData),
    [createSessionM, formData]
  )
  const handleCompletePending = useCallback(
    (sessionId: string) => completePendingM.mutate(sessionId),
    [completePendingM]
  )
  const handleConfirmComplete = useCallback(
    (sessionId: string) => confirmCompleteM.mutate(sessionId),
    [confirmCompleteM]
  )
  const handleCancelReasonChange = useCallback(
    (sessionId: string, reason: string) =>
      setCancelReasons((p) => ({ ...p, [sessionId]: reason })),
    []
  )
  const handleReviewSubmission = useCallback(
    () =>
      submitReviewM.mutate({
        tutorId: ratingData.tutorId!,
        sessionId: ratingData.sessionId!,
        rating: Number(ratingData.rating),
        comment: ratingData.comment,
      }),
    [ratingData, submitReviewM]
  )
  const handleCreateZoomLink = useCallback(
    (
      sessionId: string,
      topic: string,
      startTime: string,
      duration: number,
      tutorName: string
    ) =>
      zoomLinkM.mutate({ sessionId, topic, startTime, duration, tutorName }),
    [zoomLinkM]
  )

  return {
    user,
    transactions,
    accountDetails,
    sessions,
    activeTab,
    loading: loadingDetails,
    formData,
    ratingData,
    cancelReasons,
    role: user.role,
    showRatingModal,
    setShowRatingModal,

    // setters
    setActiveTab,
    setFormData,
    setRatingData,
    setCancelReasons,

    // handlers
    handleCancelReasonChange,
    confirmCancelSession,
    handleCancelSession,
    handleAcceptSession,
    handleSessionCreation,
    handleCompletePending,
    handleConfirmComplete,
    handleReviewSubmission,
    handleCreateZoomLink,
  }
}

export default useAccountSection
