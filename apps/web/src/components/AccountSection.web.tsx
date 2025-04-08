import React, { useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Spinner from './Spinner.web';
import { useAccountSection } from '@shared/hooks';
import debounce from 'lodash.debounce';
import type { SessionType, Transactions, User, EarningType } from '@shared/types';

// -----------------------------------------------------------------
const isSessionType = (session: unknown): session is SessionType => {
  const s = session as Record<string, unknown>;
  // Accept if either session_type or sessionType exists,
  // and if amount is a number or a string that can be converted to a number.
  const hasSessionType =
    typeof s.session_type === 'string' || typeof s.sessionType === 'string';
  const amountValid =
    typeof s.amount === 'number' ||
    (typeof s.amount === 'string' && !isNaN(Number(s.amount)));
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
  const earningData: EarningType[] = Array.isArray(accountDetails.earning)
    ? (accountDetails.earning as unknown[]).filter(isEarningType)
    : [];

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
          <p className="text-gray-400 text-lg text-center">
            Welcome to your account overview.
          </p>
        )}

        {activeTab === 'transactions' && (
          <div className="transactions space-y-4">
            <h3 className="text-xl font-semibold text-blue-400">Transaction History</h3>
            {transactions.length > 0 ? (
              transactions.map((transaction: Transactions) => (
                <div key={transaction.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
                  <p className="text-gray-300">Type: {transaction.type}</p>
                  <p className="text-gray-300">Amount: ${Math.abs(transaction.amount)}</p>
                  <p className="text-gray-300">{transaction.amount > 0 ? 'Earning' : 'Deduction'}</p>
                  <p className="text-gray-300">Description: {transaction.description || 'N/A'}</p>
                  <p className="text-gray-300">Date: {new Date(transaction.date).toLocaleDateString()}</p>
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
            {role === 'student' && (
              <>
                <form
                  className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSessionCreation();
                  }}
                >
                  {!formData.tutorId && (
                    <div className="p-2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded text-sm">
                      <p>
                        To create a session, visit the <strong>Homepage</strong>, select a tutor, and click their profile image. Use the <strong>'Create Session'</strong> button for prefilled details.
                      </p>
                    </div>
                  )}

                  <h3 className="text-lg font-semibold mb-4 text-blue-400">
                    {formData.tutorName ? `Session with Tutor ${formData.tutorName}` : 'Create a Session'}
                  </h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Subject"
                      className="block w-full p-2 rounded bg-gray-800 text-gray-300 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                    <select
                      className="block w-full p-2 rounded bg-gray-800 text-gray-300 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                        Object.entries(formData.pricing).map(([sessionType, price]) => (
                          <option key={sessionType} value={sessionType}>
                            {`${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)} - ${price} Tokens`}
                          </option>
                        ))}
                    </select>
                    <input
                      type="date"
                      className="block w-full p-2 rounded bg-gray-800 text-gray-300 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="YYYY-MM-DD"
                      value={formData.date}
                      onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <button
                    type="submit"
                    className="mt-4 w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-all duration-200"
                  >
                    Create Session
                  </button>
                </form>
                <div className="space-y-4 mt-6">
                  <h3 className="text-xl font-semibold mb-4 text-blue-400">Your Sessions</h3>
                  {sessionData.length > 0 ? (
                    sessionData.map((session) => (
                      <div key={session.id} className="bg-gray-800 p-4 rounded-lg shadow-md flex flex-col gap-4">
                        <p className="text-gray-300">
                          <span className="font-semibold">Tutor Name:</span> {session.tutor_name || 'N/A'}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-semibold">Session Type:</span> {session.sessionType || 'N/A'}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-semibold">Session Cost:</span> Ksh {session.amount || 'N/A'}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-semibold">Date:</span> {new Date(session.date).toLocaleDateString() || 'N/A'}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-semibold">Status:</span> {session.status.charAt(0).toUpperCase() + session.status.slice(1) || 'N/A'}
                        </p>
                        {session.status === 'accepted' && session.zoom_links && session.zoom_links.length > 0 && (
                          <div className="zoom-links space-y-2">
                            <p className="text-green-500 font-semibold">Zoom Links Created:</p>
                            {session.zoom_links.map((link, idx) => (
                              <div key={link} className="zoom-link">
                                <a
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 underline block"
                                >
                                  Join Meeting Part {idx + 1}
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                        {session.status === 'accepted' && (
                          <div className="space-y-4">
                            <textarea
                              className="block w-full p-3 rounded-lg bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Reason for cancellation"
                              value={cancelReasons[session.id] || ''}
                              onChange={(e) => handleCancelReasonChange(session.id, e.target.value)}
                            />
                            <button
                              className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-all duration-200"
                              onClick={() => confirmCancelSession(session.id, role, session.status)}
                            >
                              Cancel Session
                            </button>
                          </div>
                        )}
                        {session.status === 'completed_pending' && (
                          <div className="space-y-4 mt-4">
                            <p className="text-gray-400">
                              The tutor has marked this session as complete. Please confirm the completion within 24 hours.
                            </p>
                            <button
                              className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-all duration-200"
                              onClick={() => handleConfirmComplete(session.id)}
                            >
                              Confirm Completion
                            </button>
                          </div>
                        )}
                        {session.status === 'completed' && (
                          <p className="text-green-500 text-center font-semibold">Session Completed</p>
                        )}
                        {session.status === 'cancelled' && (
                          <p className="text-red-500 text-center">Session Cancelled</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center">No sessions yet.</p>
                  )}
                </div>
              </>
            )}
            {role === 'tutor' && (
              <div className="sessions space-y-6">
                <h3 className="text-xl font-semibold text-blue-400 border-b border-gray-700 pb-2">Your Upcoming Sessions</h3>
                {sessionData.length > 0 ? (
                  sessionData.map((session) => (
                    <div key={session.id} className="bg-gray-800 p-4 rounded-lg shadow-md">
                      <div className="space-y-2">
                        <p className="text-gray-300">
                          <span className="font-semibold">Student Name:</span> {session.student_name || 'N/A'}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-semibold">Student ID:</span> {session.student_id || 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-gray-300">
                          <span className="font-semibold">Session Type:</span> {session.sessionType || 'N/A'}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-semibold">Session Cost:</span> ${session.amount || 'N/A'}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-semibold">Subject:</span> {session.subject || 'N/A'}
                        </p>
                        <p className="text-gray-300">
                          <span className="font-semibold">Date:</span> {new Date(session.date).toLocaleDateString() || 'N/A'}
                        </p>
                      </div>
                      {session.status === 'upcoming' ? (
                        <div className="space-y-4">
                          <button
                            className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-all duration-200"
                            onClick={() => handleAcceptSession(session.id)}
                          >
                            Accept Session
                          </button>
                          <button
                            className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-all duration-200"
                            onClick={() => handleCancelSession(session.id, role, session.status)}
                          >
                            Cancel Session
                          </button>
                          <textarea
                            className="block w-full p-3 rounded-lg bg-gray-700 text-gray-300 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Reason for cancellation (if applicable)"
                            value={cancelReasons[session.id] || ''}
                            onChange={(e) => handleCancelReasonChange(session.id, e.target.value)}
                          />
                        </div>
                      ) : session.status === 'accepted' ? (
                        <div className="space-y-4">
                          <button
                            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-all duration-200"
                            onClick={() => navigate(`/messages?studentId=${session.student_id}`)}
                          >
                            Chat with Student
                          </button>
                          {!session.zoom_links || session.zoom_links.length === 0 ? (
                            <button
                              className="w-full bg-yellow-500 text-white py-2 rounded-lg hover:bg-yellow-600 transition-all duration-200"
                              onClick={() => {
                                const durationMapping: Record<string, number> = {
                                  privateSession: 60,
                                  groupSession: 90,
                                  lecture: 120,
                                  workshop: 180,
                                };
                                const duration =
                                  session.total_duration || durationMapping[session.sessionType] || 40;
                                handleCreateZoomLink(
                                  session.id,
                                  session.subject ?? 'General',
                                  session.date,
                                  duration,
                                  session.tutor_name || 'Unknown Tutor'
                                );
                              }}
                            >
                              Create Zoom Links
                            </button>
                          ) : (
                            <div className="mt-2 space-y-2">
                              <p className="text-green-500 font-semibold">Zoom Links Created:</p>
                              {session.zoom_links.map((link, idx) => (
                                <a
                                  key={link}
                                  href={link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 underline block"
                                >
                                  Join Meeting Part {idx + 1}
                                </a>
                              ))}
                            </div>
                          )}
                          <button
                            className="w-full bg-purple-500 text-white py-2 rounded-lg hover:bg-purple-600 transition-all duration-200"
                            onClick={() => handleCompletePending(session.id)}
                          >
                            Mark as Complete-Pending
                          </button>
                        </div>
                      ) : session.status === 'completed_pending' ? (
                        <p className="text-purple-500 text-center font-semibold">Complete-Pending</p>
                      ) : session.status === 'completed' ? (
                        <p className="text-green-500 text-center font-semibold">Session Completed</p>
                      ) : (
                        <p className="text-red-500 text-center">Session Cancelled</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center">No upcoming sessions found.</p>
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
                  <p className="text-gray-300">Date: {new Date(earning.createdAt).toLocaleDateString()}</p>
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
