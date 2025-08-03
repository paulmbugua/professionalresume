import React, { useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Spinner from './Spinner.web';
import { useAccountSection } from '@mytutorapp/shared/hooks';
import debounce from 'lodash.debounce';
import type { SessionType, Transactions, User, EarningType } from '@mytutorapp/shared/types';
 
// -----------------------------------------------------------------
const isSessionType = (session: unknown): session is SessionType => {
  const s = session as Record<string, unknown>;
  // Accept if either session_type or sessionType exists,
  // and if amount is a number or a string that can be converted to a number.
  const hasSessionType = typeof s.session_type === 'string' || typeof s.sessionType === 'string';
  const amountValid =
    typeof s.amount === 'number' || (typeof s.amount === 'string' && !isNaN(Number(s.amount)));
  return hasSessionType && amountValid && typeof s.date === 'string';
};

const isEarningType = (earning: unknown): earning is EarningType => {
  const e = earning as Record<string, unknown>;
  return (
    typeof e.amount === 'number' &&
    typeof e.description === 'string' &&
    typeof e.createdAt === 'string'
  );
};
// -----------------------------------------------------------------

const AccountSection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);

  const hookResult = useAccountSection({
    alertFn: (msg: string) => window.alert(msg),
    confirmFn: async (msg: string) => window.confirm(msg),
    navigateFn: (destination: string) => navigate(destination),
    queryParams,
  });

  const {
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
    handleAcceptSession,
    handleCancelSession,
    handleSessionCreation,
    handleCompletePending,
    handleConfirmComplete,
    handleReviewSubmission,
    setShowRatingModal,
    showRatingModal,
    ratingData,
    setRatingData,
    handleCreateZoomLink,
    handleCancelReasonChange,
    confirmCancelSession,
  } = hookResult as typeof hookResult & { user: User | null };

  // Wrap review submission with debounce so rapid form submissions are prevented.
  const debouncedReviewSubmission = useMemo(
    () => debounce(() => handleReviewSubmission(), 300),
    [handleReviewSubmission]
  );

  useEffect(() => {
    return () => {
      debouncedReviewSubmission.cancel();
    };
  }, [debouncedReviewSubmission]);

  // Filter session and earning data safely using type guards.
  const sessionData: SessionType[] = Array.isArray(accountDetails.session)
    ? (accountDetails.session as unknown[]).filter(isSessionType)
    : [];

    // Place sortedSessions here in the component:
const sortedSessions = React.useMemo(() => {
  return [...sessionData].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}, [sessionData]);

  const earningData: EarningType[] = Array.isArray(accountDetails.earning)
    ? (accountDetails.earning as unknown[]).filter(isEarningType)
    : [];

    const [justCreated, setJustCreated] = React.useState(false);
    const sessionsRef = React.useRef<HTMLDivElement>(null);
    const lastSessionRef = React.useRef<HTMLDivElement>(null);
    useEffect(() => {
  // only respond when we've flagged a brand-new session creation
  if (!justCreated) return

  // if we're not on the Sessions tab yet, switch there (and wait for the next effect run)
  if (activeTab !== 'sessions') {
    setActiveTab('sessions')
    return
  }

  // DOM is now updated, so scroll the last session into view
  requestAnimationFrame(() => {
    lastSessionRef.current?.scrollIntoView({ behavior: 'smooth' })
    setJustCreated(false)
  })

// only rerun when justCreated (or the activeTab) changes
}, [justCreated, activeTab])



  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="account-section bg-gray-900 text-white min-h-screen p-4 sm:p-6 md:p-10 pb-16">
      
      {/* Header Section */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col sm:flex-row items-center gap-6">
        {role !== 'student' && (
          <img
            src={user?.profileImage || '/default-avatar.jpg'}
            alt="Profile"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover shadow-md"
          />
        )}
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold text-blue-400">{user?.name || 'User Name'}</h2>
          <p className="text-gray-400">{user?.email}</p>
          {role === 'student' && <p className="text-gray-300">Tokens: {user?.tokens}</p>}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs flex flex-wrap justify-center sm:justify-start gap-4 mt-6 border-b border-gray-700 pb-2">
        <button
          className={`tab px-4 py-2 rounded ${
            activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab px-4 py-2 rounded ${
            activeTab === 'transactions' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}
          onClick={() => setActiveTab('transactions')}
        >
          Transactions
        </button>
        {role === 'student' && (
          <>
            <button
              className={`tab px-4 py-2 rounded ${
                activeTab === 'sessions' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              onClick={() => setActiveTab('sessions')}
            >
              Sessions
            </button>
            <button
              className={`tab px-4 py-2 rounded ${
                activeTab === 'reviews' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              onClick={() => setActiveTab('reviews')}
            >
              Reviews
            </button>
          </>
        )}
        {role === 'tutor' && (
          <>
            <button
              className={`tab px-4 py-2 rounded ${
                activeTab === 'sessions' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              onClick={() => setActiveTab('sessions')}
            >
              Sessions
            </button>
            <button
              className={`tab px-4 py-2 rounded ${
                activeTab === 'earnings' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
              onClick={() => setActiveTab('earnings')}
            >
              Earnings
            </button>
          </>
        )}
      </div>

      {/* Tab Content */}
      <div className="tab-content mt-6 pb-40">
        {activeTab === 'overview' && (
          <p className="text-gray-400 text-lg text-center">Welcome to your account overview.</p>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions space-y-4">
            <h3 className="text-xl font-semibold text-blue-400">Transaction History</h3>
            {transactions.length > 0 ? (
              transactions.map((transaction: Transactions) => (
                <div key={transaction.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
                  <p className="text-gray-300">Type: {transaction.type}</p>
                  <p className="text-gray-300">Amount: ${Math.abs(transaction.amount)}</p>
                  <p className="text-gray-300">
                    {transaction.amount > 0 ? 'Earning' : 'Deduction'}
                  </p>
                  <p className="text-gray-300">Description: {transaction.description || 'N/A'}</p>
                  <p className="text-gray-300">
                    Date: {new Date(transaction.date).toLocaleDateString()}
                  </p>
                  <p className="text-gray-300">Status: {transaction.status || 'N/A'}</p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No transactions found.</p>
            )}
          </div>
        )}

        {activeTab === 'sessions' && (
  <>
    {/* STUDENT VIEW */}
    {role === 'student' && (
      <>
        {/* Create Session Form */}
        <form
          className="bg-gray-800 p-6 max-w-2xl mx-auto rounded-md shadow-sm space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await handleSessionCreation();
              setJustCreated(true);
              setActiveTab('sessions');
            } catch (err) {
              console.error(err);
            }
          }}
        >
          {!formData.tutorId && (
            <div className="p-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded text-sm">
              <p>
                To create a session, visit the <strong>Homepage</strong>, select a tutor,
                and click their profile image. Use the <strong>'Create Session'</strong> button
                for prefilled details.
              </p>
            </div>
          )}

          <h3 className="text-lg font-semibold text-blue-400">
            {formData.tutorName
              ? `Session with Tutor ${formData.tutorName}`
              : 'Create a Session'}
          </h3>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Subject"
              className="block w-full p-2 rounded bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />

            <select
              className="block w-full p-2 rounded bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={formData.sessionType || ''}
              onChange={(e) => {
                const sessionType = e.target.value;
                const sessionCost = String(formData.pricing?.[sessionType] || 0);
                setFormData({ ...formData, sessionType, sessionCost });
              }}
            >
              <option value="" disabled>
                Select Session Type
              </option>
              {formData.pricing &&
                Object.entries(formData.pricing).map(([type, price]) => (
                  <option key={type} value={type}>
                    {`${type.charAt(0).toUpperCase() + type.slice(1)} – ${price} Tokens`}
                  </option>
                ))}
            </select>

            <input
              type="date"
              className="block w-full p-2 rounded bg-gray-700 text-gray-200 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={formData.date}
              onClick={(e) => (e.currentTarget as HTMLInputElement).showPicker?.()}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 text-sm transition"
          >
            Create Session
          </button>
        </form>

        {/* Sessions List (no scrollbar) */}
        <div
          ref={sessionsRef}
          className="p-6 bg-gray-800 rounded-md shadow-inner space-y-4 mt-6 max-w-4xl mx-auto w-full"
        >
          <h3 className="text-xl font-semibold text-blue-400 mb-4">Your Sessions</h3>

          {sortedSessions.length > 0 ? (
    sortedSessions.map((session, idx) => {
      const isLast = idx === sortedSessions.length - 1;
      return (
        <div
          key={session.id}
          ref={isLast ? lastSessionRef : undefined}
          className="bg-gray-700 p-4 rounded-md shadow-sm flex flex-col gap-4 text-sm w-full"
        >
          <p>
            <span className="font-semibold">Tutor:</span> {session.tutor_name ?? 'N/A'}
          </p>
          <p>
            <span className="font-semibold">Type:</span> {session.sessionType ?? 'N/A'}
          </p>
          <p>
            <span className="font-semibold">Subject:</span> {session.subject ?? 'N/A'}
          </p>
          <p>
            <span className="font-semibold">Cost:</span> Ksh {session.amount ?? 'N/A'}
          </p>
          <p>
            <span className="font-semibold">Date:</span>{' '}
            {new Date(session.date).toLocaleDateString()}
          </p>
          <p>
            <span className="font-semibold">Status:</span>{' '}
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </p>

          {/* Accepted: Zoom & Cancel */}
          {session.status === 'accepted' && (
            <>
              {!session.zoom_links?.length ? (
                <button
                  className="mt-2 bg-yellow-500 text-white py-1 rounded-md hover:bg-yellow-600 text-sm"
                  onClick={() =>
                    handleCreateZoomLink(
                      session.id,
                      session.subject ?? 'General',
                      session.date,
                      60,
                      session.tutor_name ?? ''
                    )
                  }
                >
                  Create Zoom Links
                </button>
              ) : (
                <div className="mt-2 space-y-1">
                  <p className="text-green-400 font-semibold">Zoom Links:</p>
                  {session.zoom_links.map((link, i) => (
                    <a
                      key={i}
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-300 underline text-sm"
                    >
                      Join Meeting Part {i + 1}
                    </a>
                  ))}
                </div>
              )}
              <textarea
                className="mt-2 block w-full p-2 rounded-md bg-gray-600 text-gray-200 border border-gray-500 text-sm"
                placeholder="Reason for cancellation"
                value={cancelReasons[session.id] ?? ''}
                onChange={(e) =>
                  handleCancelReasonChange(session.id, e.target.value)
                }
              />
              <button
                className="mt-2 bg-red-500 text-white py-1 rounded-md hover:bg-red-600 text-sm"
                onClick={() =>
                  confirmCancelSession(session.id, role, session.status)
                }
              >
                Cancel Session
              </button>
            </>
          )}

          {/* Completed Pending */}
          {session.status === 'completed_pending' && (
            <button
              className="mt-2 bg-green-500 text-white py-1 rounded-md hover:bg-green-600 text-sm"
              onClick={() => handleConfirmComplete(session.id)}
            >
              Confirm Completion
            </button>
          )}

          {/* Completed */}
          {session.status === 'completed' && (
            <p className="mt-2 text-green-300 font-semibold text-sm">
              Session Completed
            </p>
          )}

          {/* Cancelled */}
          {session.status === 'cancelled' && (
            <p className="mt-2 text-red-300 text-sm">Session Cancelled</p>
          )}
        </div>
      )
    })
  ) : (
    <p className="text-gray-500 text-center">No sessions yet.</p>
  )}
        </div>
      </>
    )}

    {/* TUTOR VIEW */}
    {role === 'tutor' && (
      <div
        ref={sessionsRef}
        className="p-6 bg-gray-800 rounded-md shadow-inner space-y-4 mt-6 max-w-4xl mx-auto w-full"
      >
        <h3 className="text-xl font-semibold text-blue-400 mb-4">
          Your Upcoming Sessions
        </h3>

        {sortedSessions.length > 0 ? (
          sortedSessions.map((session) => (
            <div
              key={session.id}
              className="bg-gray-700 p-4 rounded-md shadow-sm flex flex-col gap-4 text-sm w-full"
            >
              <p>
                <span className="font-semibold">Student:</span>{' '}
                {session.student_name || 'N/A'}
              </p>
              <p>
                <span className="font-semibold">Type:</span>{' '}
                {session.sessionType || 'N/A'}
              </p>
              <p>
                <span className="font-semibold">Date:</span>{' '}
                {new Date(session.date).toLocaleDateString()}
              </p>

              {/* Upcoming Actions */}
              {session.status === 'upcoming' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    className="bg-green-500 text-white py-1 px-2 rounded-md hover:bg-green-600 text-sm"
                    onClick={() => handleAcceptSession(session.id)}
                  >
                    Accept
                  </button>
                  <button
                    className="bg-red-500 text-white py-1 px-2 rounded-md hover:bg-red-600 text-sm"
                    onClick={() =>
                      handleCancelSession(session.id, role, session.status)
                    }
                  >
                    Cancel
                  </button>
                  <textarea
                    className="w-full mt-2 p-2 rounded-md bg-gray-600 text-gray-200 border border-gray-500 text-sm"
                    placeholder="Reason for cancellation"
                    value={cancelReasons[session.id] || ''}
                    onChange={(e) =>
                      handleCancelReasonChange(session.id, e.target.value)
                    }
                  />
                </div>
              )}

              {/* Accepted: Chat / Zoom / Complete-Pending */}
              {session.status === 'accepted' && (
                <>
                  <button
                    className="mt-2 bg-blue-500 text-white py-1 rounded-md hover:bg-blue-600 text-sm"
                    onClick={() =>
                      navigate(`/messages?studentId=${session.student_id}`)
                    }
                  >
                    Chat with Student
                  </button>
                  {!session.zoom_links?.length ? (
                    <button
                      className="mt-2 bg-yellow-500 text-white py-1 rounded-md hover:bg-yellow-600 text-sm"
                      onClick={() =>
                        handleCreateZoomLink(
                          session.id,
                          session.subject ?? 'General',
                          session.date,
                          120,
                          session.tutor_name || ''
                        )
                      }
                    >
                      Create Zoom Links
                    </button>
                  ) : (
                    <div className="mt-2 space-y-1">
                      <p className="text-green-400 font-semibold">Zoom Links:</p>
                      {session.zoom_links.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-300 underline text-sm"
                        >
                          Join Meeting Part {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  <button
                    className="mt-2 bg-purple-500 text-white py-1 rounded-md hover:bg-purple-600 text-sm"
                    onClick={() => handleCompletePending(session.id)}
                  >
                    Mark as Complete-Pending
                  </button>
                </>
              )}

              {/* Completed Pending */}
              {session.status === 'completed_pending' && (
                <p className="mt-2 text-purple-300 font-semibold text-sm">
                  Complete-Pending
                </p>
              )}

              {/* Completed */}
              {session.status === 'completed' && (
                <p className="mt-2 text-green-300 font-semibold text-sm">
                  Session Completed
                </p>
              )}

              {/* Cancelled */}
              {session.status === 'cancelled' && (
                <p className="mt-2 text-red-300 text-sm">Session Cancelled</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-center">No upcoming sessions.</p>
        )}
      </div>
    )}
  </>
)}


        {activeTab === 'reviews' && (
          <form
            className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              debouncedReviewSubmission();
            }}
          >
            <h3 className="text-xl font-semibold text-blue-400">Post a Review</h3>
            <input
              type="text"
              placeholder="Tutor ID"
              className="block w-full p-3 rounded bg-gray-900 text-gray-300"
              onChange={(e) => setFormData({ ...formData, tutorId: e.target.value })}
            />
            <textarea
              placeholder="Comment"
              className="block w-full p-3 rounded bg-gray-900 text-gray-300"
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
            />
            <input
              type="number"
              placeholder="Rating (1-5)"
              className="block w-full p-3 rounded bg-gray-900 text-gray-300"
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
            />
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
            >
              Submit Review
            </button>
          </form>
        )}

        {activeTab === 'earnings' && (
          <div className="earnings space-y-4">
            <h3 className="text-xl text-blue-400 font-semibold">Your Earnings</h3>
            {earningData.length > 0 ? (
              earningData.map((earning) => (
                <div key={earning.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
                  <p className="text-gray-300">Amount: ${earning.amount}</p>
                  <p className="text-gray-300">Description: {earning.description}</p>
                  <p className="text-gray-300">
                    Date: {new Date(earning.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No earnings found.</p>
            )}
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold text-white mb-4">Rate Your Tutor</h2>
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Rating (1-5):</label>
              <input
                type="number"
                min="1"
                max="5"
                value={ratingData.rating}
                onChange={(e) => setRatingData({ ...ratingData, rating: e.target.value })}
                className="w-full p-2 rounded bg-gray-700 text-white"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-300 mb-1">Comment:</label>
              <textarea
                value={ratingData.comment}
                onChange={(e) => setRatingData({ ...ratingData, comment: e.target.value })}
                className="w-full p-2 rounded bg-gray-700 text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
                onClick={() => setShowRatingModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 rounded"
                onClick={handleReviewSubmission}
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSection;
