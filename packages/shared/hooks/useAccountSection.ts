// packages/shared/hooks/useAccountSection.ts
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { useShopContext } from '@mytutorapp/shared/context'
import useAppQuery from './useAppQuery'
import { useMutation } from '@tanstack/react-query'
import * as accountApi from '@mytutorapp/shared/api'
import axios from 'axios'
import type {
  SessionFormData,
  RatingFormData,
  Transactions,
  SessionType,
  EarningType,
} from '@mytutorapp/shared/types'

interface AccountUser {
  userId: string
  email: string
  tokens: number
}
interface AccountProfileInner {
  name: string
  gallery: string[]
  role: 'student' | 'tutor'
  earning?: EarningType[] | unknown
  payoutCurrency?: string
  payout_currency?: string
}
interface AccountProfile {
  profileExists: boolean
  profile: AccountProfileInner
}
interface AccountResp {
  user: AccountUser
  profile: AccountProfile
}

export interface UseAccountSectionResult {
  user: {
    userId?: string
    email: string | null
    name?: string
    profileImage: string
    tokens: number
    role: 'student' | 'tutor'
  }
  transactions: Transactions[]
  sessions: SessionType[]
  earnings: EarningType[]
  loading: boolean

  // currency + refetchers
  payoutCurrency: 'USD' | 'KES'
  refetchAccount: () => Promise<unknown>
  refetchTransactions: () => Promise<unknown>

  activeTab: 'overview' | 'transactions' | 'sessions' | 'reviews' | 'earnings'
  formData: SessionFormData
  ratingData: RatingFormData
  cancelReasons: Record<string, string>
  showRatingModal: boolean

  // setters
  setActiveTab: (tab: UseAccountSectionResult['activeTab']) => void
  setFormData: Dispatch<SetStateAction<SessionFormData>>
  setRatingData: (rd: RatingFormData) => void
  setCancelReasons: (r: Record<string, string>) => void
  setShowRatingModal: (v: boolean) => void

  // handlers
  handleCancelReasonChange: (sessionId: string, reason: string) => void
  confirmCancelSession: (sessionId: string, role: string, status: string) => void
  handleCancelSession: (sessionId: string) => void
  handleAcceptSession: (sessionId: string) => void
  handleSessionCreation: () => void
  handleCompletePending: (sessionId: string) => void
  handleConfirmComplete: (sessionId: string) => void
  handleReviewSubmission: () => void
  handleCreateZoomLink: (
    sessionId: string,
    topic: string,
    startTime: string,
    duration: number,
    tutorName: string
  ) => void
}

const isEarningArray = (x: unknown): x is EarningType[] =>
  Array.isArray(x) &&
  x.every(
    (e) =>
      typeof (e as EarningType).amount === 'number' &&
      typeof (e as EarningType).description === 'string' &&
      typeof (e as EarningType).createdAt === 'string'
  );

export const useAccountSection = (
  options?: {
    alertFn?: (message: string) => void
    confirmFn?: (message: string) => Promise<boolean>
    navigateFn?: (destination: string) => void
    queryParams?: URLSearchParams
  }
): UseAccountSectionResult => {
  const { alertFn, confirmFn, navigateFn, queryParams } = options ?? {}
  const { token, backendUrl, setTokens } = useShopContext()

  // 1️⃣ Fetch account response
  const {
    data: acctResp,
    isLoading: loadingDetails,
    refetch: refetchAccount,
  } = useAppQuery<AccountResp, Error>(
    ['accountDetails', token],
    () => accountApi.fetchAccountDetails(backendUrl, token!),
    { enabled: Boolean(token) }
  )

  // 2️⃣ Build user object
  const user = {
    userId: acctResp?.user.userId,
    email: acctResp?.user.email ?? null,
    name: acctResp?.profile.profileExists
      ? acctResp.profile.profile.name
      : undefined,
    profileImage: acctResp?.profile.profileExists
      ? acctResp.profile.profile.gallery[0]
      : '/default-avatar.jpg',
    tokens: acctResp?.user.tokens ?? 0,
    role: (acctResp?.profile.profile.role ?? 'student') as 'student' | 'tutor',
  }

  // Payout currency (narrow to union)
  const payoutCurrency: 'USD' | 'KES' = (() => {
    const raw =
      acctResp?.profile.profile.payoutCurrency ??
      acctResp?.profile.profile.payout_currency ??
      'USD';
    return raw?.toUpperCase() === 'KES' ? 'KES' : 'USD';
  })();

  // sync tokens
  const prevTokens = useRef<number>()
  useEffect(() => {
    if (user.tokens !== prevTokens.current) {
      prevTokens.current = user.tokens
      setTokens(user.tokens)
    }
  }, [user.tokens, setTokens])

  // 3️⃣ Transactions
  const {
    data: transactions = [],
    refetch: refetchTransactions,
  } = useAppQuery<Transactions[], Error>(
    ['transactions', token],
    () => accountApi.fetchTransactions(backendUrl, token!),
    { enabled: Boolean(token) }
  )

  // 4️⃣ Sessions
  const {
    data: sessions = [],
    refetch: refetchSessions,
  } = useAppQuery<SessionType[], Error>(
    ['sessions', token],
    () => accountApi.fetchSessionsByType(backendUrl, token!, 'session'),
    { enabled: Boolean(token) }
  )

  // 5️⃣ Earnings
  const rawEarnings = acctResp?.profile.profile.earning
  const earnings: EarningType[] = isEarningArray(rawEarnings) ? rawEarnings : []

  // 6️⃣ Local UI state
  const [activeTab, setActiveTab] = useState<
    'overview' | 'transactions' | 'sessions' | 'reviews' | 'earnings'
  >('overview')

  const [formData, setFormData] = useState<SessionFormData>({
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
    studentName: '',
    createdAt: '',
  })
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({})
  const [showRatingModal, setShowRatingModal] = useState(false)

  // 7️⃣ Mutations
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
  const createSessionM = useMutation<void, Error, SessionFormData>({
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
      // refresh account/transactions so Earnings reflect immediately
      refetchTransactions()
      refetchAccount()

      // Find the session and safely extract tutor_id
      const done = sessions.find((s) => String(s.id) === sessionId)
      if (done) {
        const tutorIdForRating = done.tutor_id != null ? String(done.tutor_id) : ''
        setRatingData({
          id: '',
          tutorId: tutorIdForRating,
          sessionId,
          rating: '',
          comment: '',
          studentName: '',
          createdAt: '',
        })
        setShowRatingModal(true)
      }
    },
    onError: () => alertFn?.('Failed to confirm completion.'),
  })

  const submitReviewM = useMutation<void, Error, {
    tutorId: string
    sessionId: string
    rating: number
    comment: string
  }>(
    {
      mutationFn: (body) =>
        accountApi.submitReview(backendUrl, token!, body),
      onSuccess: () => {
        alertFn?.('Review submitted.')
        setShowRatingModal(false)
        refetchSessions()
      },
      onError: (err) => {
        if (axios.isAxiosError(err)) {
          alertFn?.(err.response?.data?.message ?? 'Failed to submit review.')
        } else {
          alertFn?.('Failed to submit review.')
        }
      },
    }
  )
  const zoomLinkM = useMutation<void, Error, {
    sessionId: string
    topic: string
    startTime: string
    duration: number
    tutorName: string
  }>(
    {
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
    }
  )

  // 8️⃣ URL‐driven tab logic
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

  // 🔁 Keep Earnings fresh whenever user views that tab or window refocuses
  useEffect(() => {
    if (activeTab !== 'earnings') return
    // immediate refresh on tab entry
    refetchTransactions()
    refetchAccount()

    const onFocus = () => {
      refetchTransactions()
      refetchAccount()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [activeTab, refetchTransactions, refetchAccount])

  // 9️⃣ Handlers
  const confirmCancelSession = useCallback(
    async (sessionId: string, role: string, status: string) => {
      if (role === 'tutor' && status === 'pending') {
        alertFn?.('Tutors cannot cancel a pending session.')
        return
      }
      if (await (confirmFn ? confirmFn('Are you sure you want to cancel this session?') : Promise.resolve(false))) {
        cancelSessionM.mutate({ sessionId, reason: cancelReasons[sessionId] ?? '' })
      }
    },
    [confirmFn, cancelReasons, cancelSessionM, alertFn]
  )
  const handleAcceptSession = useCallback(
    (sessionId: string) => acceptSessionM.mutate(sessionId),
    [acceptSessionM]
  )
  const handleCancelSession = useCallback(
    (sessionId: string) => confirmCancelSession(sessionId, user.role, ''),
    [confirmCancelSession, user.role]
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
        comment: ratingData.comment!,
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

  //  🔟 Return the shape
  return {
    user,
    transactions,
    sessions,
    earnings,
    loading: loadingDetails,

    // expose payout currency + refetchers
    payoutCurrency,
    refetchAccount,
    refetchTransactions,

    activeTab,
    formData,
    ratingData,
    cancelReasons,
    showRatingModal,

    setActiveTab,
    setFormData,
    setRatingData,
    setCancelReasons,
    setShowRatingModal,

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
