// packages/shared/hooks/useAccountSection.ts

import { useState, useEffect, useCallback, useRef } from 'react'
import { useShopContext } from '@mytutorapp/shared/context'
import useAppQuery from '../hooks/useAppQuery'
import { useMutation } from '@tanstack/react-query'
import * as accountApi from '@mytutorapp/shared/api'
import axios from 'axios'
import type {
  FormData,
  RatingFormData,
  AccountDetails,
  Transactions,
  Session,
  SessionType,
} from '@mytutorapp/shared/types'

export interface AccountUser {
  userId?: string
  email: string | null
  name?: string
  profileImage?: string
  tokens?: number
  role?: string
}

export interface UseAccountOptions {
  alertFn?: (message: string) => void
  confirmFn?: (message: string) => Promise<boolean>
  navigateFn?: (destination: string) => void
  queryParams?: URLSearchParams
}

export const useAccountSection = (options?: UseAccountOptions) => {
  const { alertFn, confirmFn, navigateFn, queryParams } = options || {}
  const { token, backendUrl, setTokens } = useShopContext()

  // ─── 1) Account details ───────────────────────────────────────────────────────
  const { data: acctResp, isLoading: loadingDetails } = useAppQuery<
    { user: any; profile: { profileExists: boolean; profile: any } },
    Error
  >(
    ['accountDetails', token],
    () => accountApi.fetchAccountDetails(backendUrl, token!),
    { enabled: Boolean(token) }
  )

  // Build the "user" object
  const user: AccountUser = {
    userId: acctResp?.user.userId,
    email: acctResp?.user.email ?? null,
    name: acctResp?.profile.profileExists
      ? acctResp.profile.profile.name
      : acctResp?.user.name,
    profileImage: acctResp?.profile.profileExists
      ? acctResp.profile.profile.gallery?.[0]
      : '/default-avatar.jpg',
    tokens: acctResp?.user.tokens ?? 0,
    role: acctResp?.profile.profileExists
      ? acctResp.profile.profile.role!
      : '',
  }

  // ─── Sync tokens back to ShopContext—but only when they truly change ───────
  const prevTokens = useRef<number>()
  useEffect(() => {
    if (
      typeof user.tokens === 'number' &&
      user.tokens !== prevTokens.current
    ) {
      prevTokens.current = user.tokens
      setTokens(user.tokens)
    }
  }, [user.tokens, setTokens])

  // ─── 2) Transactions ─────────────────────────────────────────────────────────
  const { data: transactions = [] } = useAppQuery<Transactions[], Error>(
    ['transactions', token],
    () => accountApi.fetchTransactions(backendUrl, token!),
    { enabled: Boolean(token) }
  )

  // ─── 3) Sessions ─────────────────────────────────────────────────────────────
  const {
    data: sessionsRaw = [],
    refetch: refetchSessions,
  } = useAppQuery<SessionType[], Error>(
    ['sessions', token],
    () => accountApi.fetchSessionsByType(backendUrl, token!, 'session'),
    { enabled: Boolean(token) }
  )
  const sessions: Session[] = sessionsRaw.map((s) => ({
    id: s.id,
    tutor_name: s.tutor_name,
    student_name: s.student_name,
    student_id: s.student_id,
    sessionType: s.sessionType,
    amount: s.amount,
    date: s.date,
    status: s.status,
    zoom_links: s.zoom_links,
    total_duration: s.total_duration,
    tutorUser: (s as any).tutorUser ?? '',
  }))

  // Always include `session` & `earning` in accountDetails
  const accountDetails: AccountDetails = {
    ...(acctResp?.profile.profile ?? {}),
    session: sessions,
    earning: Array.isArray((acctResp?.profile.profile as any)?.earning)
      ? ((acctResp!.profile.profile as any).earning as any[])
      : [],
  }

  // ─── 4) Local UI state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<string>('overview')
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
  const [showRatingModal, setShowRatingModal] = useState<boolean>(false)

  // ─── 5) Mutations ────────────────────────────────────────────────────────────
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
    onError: (err: any) => {
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
    onSuccess: () => {
      alertFn?.('Session confirmed complete.')
      refetchSessions()
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
    onError: (err: any) =>
      alertFn?.(
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to submit review.'
      ),
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
    mutationFn: ({ sessionId, topic, startTime, duration, tutorName }) =>
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

  // ─── 6) URL‐driven tab logic ─────────────────────────────────────────────────
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

  // ─── 7) Handlers ─────────────────────────────────────────────────────────────
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
    (sessionId: string, reason: string) => {
      setCancelReasons((prev) => ({ ...prev, [sessionId]: reason }))
    },
    []
  )
  const handleReviewSubmission = useCallback(() => {
    submitReviewM.mutate({
      tutorId: ratingData.tutorId!,
      sessionId: ratingData.sessionId!,
      rating: Number(ratingData.rating),
      comment: ratingData.comment,
    })
  }, [submitReviewM, ratingData])
  const handleCreateZoomLink = useCallback(
    (
      sessionId: string,
      topic: string,
      startTime: string,
      duration: number,
      tutorName: string
    ) =>
      zoomLinkM.mutate({
        sessionId,
        topic,
        startTime,
        duration,
        tutorName,
      }),
    [zoomLinkM]
  )

  // ─── Return everything ────────────────────────────────────────────────────────
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
    role: user.role!,
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
    handleCancelSession: confirmCancelSession,
    handleAcceptSession,
    handleSessionCreation,
    handleCompletePending,
    handleConfirmComplete,
    handleReviewSubmission,
    handleCreateZoomLink,
  }
}

export default useAccountSection
