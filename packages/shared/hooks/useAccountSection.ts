// packages/shared/hooks/useAccountSection.ts
import axios, { AxiosError } from 'axios'
import { useState, useEffect } from 'react'
import { useShopContext } from '@mytutorapp/shared/context'
import * as accountApi from '@mytutorapp/shared/api'
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

export interface AccountSectionState {
  user: AccountUser
  transactions: Transactions[]
  accountDetails: AccountDetails
  activeTab: string
  loading: boolean
  formData: FormData
  ratingData: RatingFormData
  cancelReasons: Record<string, string>
  role: string
  showRatingModal: boolean
}

export interface UseAccountOptions {
  alertFn?: (message: string) => void
  confirmFn?: (message: string) => Promise<boolean>
  navigateFn?: (destination: string) => void
  queryParams?: URLSearchParams
}

export const useAccountSection = (options?: UseAccountOptions) => {
  const { alertFn, confirmFn, navigateFn, queryParams } = options || {}
  const {
    token,
    backendUrl,
    tokens,
    userEmail,
    setTokens,
    refreshUserDetails,
  } = useShopContext()

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
    // Include an 'id' property in ratingData
    ratingData: { id: '', tutorId: '', sessionId: '', rating: '', comment: '' },
    cancelReasons: {},
    role: '',
    showRatingModal: false,
  })

  // ─── Fetch Account Details ───────────────────────────────────────────────────
  const fetchAccountDetails = async () => {
    if (!token) {
      console.warn('[useAccount] No token—skipping account fetch')
      return
    }

    const userUrl = `${backendUrl}/api/user/me`
    const profileUrl = `${backendUrl}/api/profile/me`
    console.log('[useAccount] ➜ fetchAccountDetails', {
      userUrl,
      profileUrl,
      token: token.slice(0, 10) + '…',
    })

    try {
      const { user, profile } = await accountApi.fetchAccountDetails(
        backendUrl,
        token
      )
      console.log('[useAccount] ✅ account API returned:', { user, profile })

      const updatedUser: AccountUser = {
        userId: user.userId,
        email: user.email,
        name: profile.profileExists
          ? profile.profile.name || 'Guest'
          : user.name || 'Guest',
        profileImage: profile.profileExists
          ? profile.profile.gallery?.[0] || '/default-avatar.jpg'
          : '/default-avatar.jpg',
        tokens: user.tokens || 0,
        role:
          profile.profileExists && profile.profile.role
            ? profile.profile.role
            : '',
      }

      console.log('[useAccount] ℹ️ setting updatedUser:', updatedUser)
      setState((prev) => ({
        ...prev,
        user: updatedUser,
        role: updatedUser.role || '',
      }))
    } catch (err: unknown) {
      const e = err as AxiosError
      console.error('[useAccount] ❌ fetchAccountDetails error:', {
        message: e.message,
        status: e.response?.status,
        url: e.config?.url,
        data: e.response?.data,
      })
      alertFn?.('Failed to load account details.')
    } finally {
      console.log('[useAccount] fetchAccountDetails → setting loading=false')
      setState((prev) => ({ ...prev, loading: false }))
    }
  }

  // ─── Fetch Transactions ──────────────────────────────────────────────────────
  const fetchTransactions = async () => {
    if (!token) {
      console.warn('[useAccount] No token—skipping transactions fetch')
      return
    }

    const txUrl = `${backendUrl}/api/payment/transactions`
    console.log('[useAccount] ➜ fetchTransactions', {
      txUrl,
      token: token.slice(0, 10) + '…',
    })

    try {
      const transactions = await accountApi.fetchTransactions(
        backendUrl,
        token
      )
      console.log('[useAccount] ✅ transactions API returned:', transactions)
      setState((prev) => ({ ...prev, transactions }))
    } catch (err: unknown) {
      const e = err as AxiosError
      console.error('[useAccount] ❌ fetchTransactions error:', {
        message: e.message,
        status: e.response?.status,
        url: e.config?.url,
        data: e.response?.data,
      })
      alertFn?.('Failed to load transactions.')
    }
  }

  // ─── Debug: watch entire state object ────────────────────────────────────────
  useEffect(() => {
    console.log('[useAccount] state updated:', state)
  }, [state])

  // ─── Fetch Updated Token Balance ─────────────────────────────────────────────
  const fetchUpdatedTokenBalance = async () => {
    if (!token) return
    try {
      const newBalance = await accountApi.fetchUpdatedTokenBalance(
        backendUrl,
        token
      )
      setTokens(newBalance)
      setState((prev) => ({
        ...prev,
        user: { ...prev.user, tokens: newBalance },
      }))
    } catch (error) {
      console.error(error)
    }
  }

  // ─── Fetch Sessions ──────────────────────────────────────────────────────────
  const fetchSessions = async () => {
    if (!token) {
      console.warn('[useAccount] No token—skipping fetchSessions')
      return
    }

    try {
      const sessions = await accountApi.fetchSessionsByType(
        backendUrl,
        token,
        'session'
      )
      console.log('[useAccount] Fetched sessions:', sessions)

      // Map each “session” object into the shape that SessionType expects,
      // but then cast into a raw `Session[]` for AccountDetails.session.
      const mappedSessions = (sessions as any[]).map((session) => {
        console.log('[useAccount] Session item:', session)
        return {
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
          // carry the raw tutor‐user ID so we can use it when posting a review:
          tutorUser: session.tutorUser ?? session.tutor_user ?? '',
        }
      })

      // Now force‐cast into `Session[]` so that AccountDetails.session no longer complains:
      const rawAsSessionArray = mappedSessions as unknown as Session[]

      console.log('[useAccount] Mapped sessions (as Session[]):', rawAsSessionArray)
      setState((prev) => ({
        ...prev,
        accountDetails: {
          ...prev.accountDetails,
          session: rawAsSessionArray,
        },
      }))
    } catch (error) {
      console.error('[useAccount] Failed to fetch sessions:', error)
    }
  }

  // ─── Initial Data Load ───────────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      refreshUserDetails()
      fetchAccountDetails()
      fetchTransactions()
      fetchUpdatedTokenBalance()
      fetchSessions()
    }
  }, [token, backendUrl])

  // ─── React to “?action=createSession” in query params ────────────────────────
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
      }))
    }
  }, [queryParams])

  // ─── Handle Reason Changes ───────────────────────────────────────────────────
  const handleCancelReasonChange = (sessionId: string, reason: string) => {
    setState((prev) => ({
      ...prev,
      cancelReasons: { ...prev.cancelReasons, [sessionId]: reason },
    }))
  }

  // ─── Confirm & Cancel Session ────────────────────────────────────────────────
  const confirmCancelSession = async (
    sessionId: string,
    _role: string,
    _status: string
  ) => {
    if (
      confirmFn &&
      (await confirmFn('Are you sure you want to cancel this session?'))
    ) {
      await handleCancelSession(sessionId, _role, _status)
    }
  }

  const handleCancelSession = async (
    sessionId: string,
    role: string,
    status: string
  ) => {
    const reason = state.cancelReasons[sessionId] || ''
    if (!reason.trim()) {
      alertFn?.('Please provide a reason for cancellation.')
      return
    }
    if (role === 'tutor' && status === 'pending') {
      alertFn?.('Tutors cannot cancel a pending session.')
      return
    }

    try {
      await accountApi.cancelSession(backendUrl, token!, sessionId, reason)
      alertFn?.('Session cancelled successfully.')
      await fetchSessions()
    } catch {
      alertFn?.('Failed to cancel session.')
    }
  }

  // ─── Accept Session ──────────────────────────────────────────────────────────
  const handleAcceptSession = async (sessionId: string) => {
    try {
      await accountApi.acceptSession(backendUrl, token!, sessionId)
      alertFn?.('Session accepted successfully.')
      await fetchSessions()
    } catch {
      alertFn?.('Failed to accept session.')
    }
  }

  // ─── Create Session ──────────────────────────────────────────────────────────
  const handleSessionCreation = async () => {
    try {
      const { tutorName, pricing, ...payload } = state.formData
      console.log(
        '[useAccount] ▶︎ Creating session with payload:',
        JSON.stringify(payload, null, 2),
        '\n→ backendUrl:',
        backendUrl,
        '\n→ token (truncated):',
        token?.slice(0, 10) + '…'
      )

      await accountApi.createSession(
        backendUrl,
        token!,
        payload as unknown as FormData
      )
      alertFn?.('Session created successfully.')
      await fetchSessions()
    } catch (error: unknown) {
      const err = error as AxiosError<{ message?: string }>
      console.log('[useAccount] ❌ createSession error response:', {
        status: err.response?.status,
        data: err.response?.data,
        url: err.config?.url,
      })

      if (
        err.response?.status === 400 &&
        err.response.data?.message?.includes('Insufficient tokens')
      ) {
        alertFn?.('Insufficient tokens. Please buy more tokens.')
        navigateFn?.('/buy-tokens')
      } else {
        alertFn?.('Failed to create session.')
      }
    }
  }

  // ─── Mark “Complete‐Pending” ─────────────────────────────────────────────────
  const handleCompletePending = async (sessionId: string) => {
    try {
      await accountApi.completePendingSession(
        backendUrl,
        token!,
        sessionId
      )
      alertFn?.('Session marked as complete-pending.')
      await fetchSessions()
    } catch (err: unknown) {
      const e = err as AxiosError<{ message: string }>
      const serverMsg = e.response?.data?.message
      alertFn?.(serverMsg ?? 'Failed to mark session as complete-pending.')
    }
  }

  // ─── Confirm Complete + Open Rating Modal ───────────────────────────────────
  const handleConfirmComplete = async (sessionId: string) => {
    try {
      await accountApi.confirmSessionCompletion(
        backendUrl,
        token!,
        sessionId
      )
      alertFn?.('Session confirmed as complete.')
      await fetchSessions()

      // Now retrieve sessions (cast to SessionType[] for internal use)
      const allSessions =
        Array.isArray(state.accountDetails.session)
          ? (state.accountDetails.session as unknown as SessionType[])
          : []

      // Find the just‐completed session by matching `id`
      const completedSession = allSessions.find(
        (s: SessionType) => String(s.id) === String(sessionId)
      )

      // Extract the tutor’s user‐ID from our raw field:
      const payloadTutorId =
        (completedSession as any).tutorUser ?? ''

      console.log(
        '[useAccount] Completed session:', completedSession,
        '→ sending tutorId:', payloadTutorId
      )

      // Populate `ratingData` with the tutor’s ID
      setState((prev) => ({
        ...prev,
        ratingData: {
          id: '',
          tutorId: payloadTutorId,
          sessionId,
          rating: '',
          comment: '',
        },
      }))

      // Open the rating modal
      setState((prev) => ({ ...prev, showRatingModal: true }))
    } catch {
      alertFn?.('Failed to confirm session completion.')
    }
  }

  // ─── Submit Review ────────────────────────────────────────────────────────────
  // ─── Submit Review ────────────────────────────────────────────────────────────
const handleReviewSubmission = async () => {
  try {
    const { tutorId, sessionId, comment, rating } = state.ratingData

    // Build a payload and only include `comment` if it’s non‐empty
    const body: { tutorId: string; sessionId?: string; rating: number; comment?: string } = {
      tutorId: String(tutorId),
      sessionId: String(sessionId),
      rating: Number(rating),
      ...(comment.trim() !== "" && { comment: comment.trim() }),
    }

    console.log("[useAccount] ▶️ submitReview payload:", body)

    // Call submitReview with the dynamically constructed body
    await accountApi.submitReview(backendUrl, token!, body as any)

    alertFn?.("Review submitted successfully.")

    setState((prev) => ({
      ...prev,
      ratingData: { id: "", tutorId: "", sessionId: "", rating: "", comment: "" },
      showRatingModal: false,
    }))
    await fetchSessions()
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response?.data) {
      alertFn?.((err.response.data as any).message || "Validation error.")
    } else {
      alertFn?.("Failed to submit review.")
    }
  }
}


  // ─── Create Zoom Link ─────────────────────────────────────────────────────────
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
        token!,
        sessionId,
        topic,
        startTime,
        duration,
        tutorName
      )
      alertFn?.('Zoom link created successfully!')
      await fetchSessions()
    } catch {
      alertFn?.('Failed to create Zoom link.')
    }
  }

  return {
    ...state,
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
  }
}

export default useAccountSection
