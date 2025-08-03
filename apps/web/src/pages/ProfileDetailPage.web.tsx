// apps/web/src/pages/ProfileDetailPage.web.tsx

import React, { useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useProfileDetail from '@mytutorapp/shared/hooks/useProfileDetail';
import useProfileCard from '@mytutorapp/shared/hooks/useProfileCard';
import { useShopContext } from '@mytutorapp/shared/context';
import type { TutorProfile } from '@mytutorapp/shared/types';
import debounce from 'lodash.debounce';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faPaperPlane, faSmile, faTimes } from '@fortawesome/free-solid-svg-icons';
import Navbar from '../components/Navbar.web';
import Footer from '../components/Footer.web';
import Spinner from '../components/Spinner.web';
import ProfileActions from '../components/ProfileActions.web';
import TutorReviews from '../components/TutorReviews.web';

// fallback must match TutorProfile exactly:
const defaultTutorProfile: TutorProfile = {
  id:           '',
  user:         '',
  name:         '',
  category:     '',
  gallery:      [],
  video:        '',
  role:         undefined,
  status:       undefined,
  lastOnline:   undefined,
  description:  {},
  recommended:  [],
  languages:    [],
  pricing:      { privateSession: '0', groupSession: '0', lecture: '0', workshop: '0' },
  rating:       0,
  totalReviews: 0,
};

const ProfileDetailPage: React.FC = () => {
  // inline-route-typing instead of MainStackParamList
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { backendUrl, profile: myProfile, token } = useShopContext();

  const {
    tutorProfile,
    loading,
    showChat,
    newMessage,
    setNewMessage,
    toggleChat,
    handleCreateSession,
    handleSendMessage,
    chatMessages,
    selectedImage,
    handleImageClick,
    closeModal,
  } = useProfileDetail(id!, backendUrl);

  const resolveAsset = (raw: string) =>
    raw.startsWith('/') ? `${backendUrl}${raw}` : raw;

  const debouncedSendMessage = useMemo(
    () => debounce(handleSendMessage, 300),
    [handleSendMessage]
  );
  useEffect(() => () => debouncedSendMessage.cancel(), [debouncedSendMessage]);

  // use the hook’s TutorProfile (or fallback)
  const profile: TutorProfile = useMemo(
    () => tutorProfile ?? defaultTutorProfile,
    [tutorProfile]
  );

  // sync metadata (useProfileCard expects whatever `useProfileCard` types define)
  useProfileCard(profile, backendUrl, token);

  const onCreateSession = useCallback(
    () => handleCreateSession(navigate),
    [handleCreateSession, navigate]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <Spinner />
      </div>
    );
  }

  if (!tutorProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <p className="text-gray-300">Tutor profile not found.</p>
      </div>
    );
  }

  // status pill color
  const statusColor =
    profile.status === 'Online' ? 'bg-green-500' :
    profile.status === 'Busy'   ? 'bg-yellow-500' :
    profile.status === 'Free'   ? 'bg-purple-500' :
                                  'bg-gray-500';

  // guard arrays
  const languages     = profile.languages ?? [];
  const expertise     = profile.description?.expertise    ?? [];
  const teachingStyle = profile.description?.teachingStyle ?? [];

  const pricingSections: [string, string][] = [
    ['Private Session (60 mins)', profile.pricing.privateSession],
    ['Group Session (90 mins)',   profile.pricing.groupSession],
    ['Workshop (120 mins)',       profile.pricing.workshop],
    ['Lecture (180 mins)',        profile.pricing.lecture],
  ];

  const aboutSections: [string, string[]][] = [
    ['Expertise',      expertise],
    ['Teaching Style', teachingStyle],
  ];

  return (
    <div className="bg-gray-900 text-white min-h-screen">
      {/* Navbar */}
      <div className="fixed top-0 left-0 w-full z-50">
        <Navbar
          onSearch={() => {}}
          filters={{}}
          onFilterChange={() => {}}
          clearFilters={() => {}}
        />
      </div>

      <div className="pt-72 md:pt-32 px-4 lg:px-8 max-w-7xl mx-auto space-y-12">
        {/* Top gallery + info */}
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/2 lg:w-2/5 flex">
            <img
              src={profile.gallery[0] ? resolveAsset(profile.gallery[0]) : '/default-image.jpg'}
              alt={profile.name}
              className="w-full h-80 md:h-[400px] object-cover rounded-lg shadow-lg cursor-pointer"
              onClick={() => handleImageClick(profile.gallery[0] || '')}
            />
          </div>
          <div className="w-full md:flex-1 bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
            <div className="flex items-center space-x-4">
              <img
                src={profile.gallery[0] ? resolveAsset(profile.gallery[0]) : '/default-avatar.jpg'}
                alt={profile.name}
                className="h-20 w-20 rounded-full shadow-md object-cover"
              />
              <div>
                <h2 className="text-2xl font-semibold">{profile.name}</h2>
                <p className="text-sm text-gray-400">
                  Category: <span className="text-yellow-400">{profile.category || 'N/A'}</span>
                </p>
                <p className="text-sm text-gray-400">
                  Speaks: {languages.join(', ') || 'N/A'}
                </p>
                <span className={`inline-block mt-2 px-3 py-1 text-xs rounded-full ${statusColor}`}>
                  {profile.status}
                </span>
              </div>
            </div>

            <button
              onClick={onCreateSession}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition"
            >
              Create Session
            </button>

            <div className="space-y-1 text-gray-300 text-sm">
              {pricingSections.map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span className="font-semibold">{val} tokens</span>
                </div>
              ))}
            </div>

            <button
              className={`w-full py-2 rounded-lg font-semibold ${statusColor} text-white`}
            >
              {profile.status === 'Online' ? "I'm available" : "I'm not available"}
            </button>

            <ProfileActions
              recipientId={profile.user}
              onSendMessage={toggleChat}
            />
          </div>
        </div>

        {/* Video */}
        {profile.video && (
          <video
            src={resolveAsset(profile.video)}
            controls
            className="w-full lg:w-2/3 h-48 object-cover rounded-lg shadow-md"
          />
        )}

        {/* About & Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg space-y-4">
            <h3 className="text-xl font-semibold text-pink-600">About Me</h3>
            <p className="text-gray-300">{profile.description?.bio || 'No bio available.'}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {aboutSections.map(([title, items]) => (
                <div key={title}>
                  <h4 className="text-lg font-semibold text-pink-500">{title}</h4>
                  {items.length > 0 ? (
                    items.map((it, i) => (
                      <p key={i} className="text-gray-300 text-sm">{it}</p>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Not specified</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <TutorReviews tutorId={profile.user} />
          </div>
        </div>

        {/* Recommended Tutors */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-4">
          <h3 className="text-xl font-semibold">Recommended Tutors</h3>
          <ProfileActions.Recommended
            recommended={profile.recommended}
            statusColor={statusColor}
          />
        </div>
      </div>

      <Footer />

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <button
            className="absolute top-4 right-4 text-white text-2xl"
            onClick={closeModal}
          >
            <FontAwesomeIcon icon={faTimes as IconProp} />
          </button>
          <img
            src={resolveAsset(selectedImage)}
            alt="Zoom"
            className="max-h-[90vh] max-w-[80vw] rounded-lg shadow-xl"
          />
        </div>
      )}

      {/* Chat Toggle */}
      {myProfile?.id !== profile.id && (
        <button
          onClick={toggleChat}
          className="fixed bottom-8 right-8 bg-pink-500 p-3 rounded-full shadow-lg hover:bg-pink-600 transition z-40"
        >
          <FontAwesomeIcon icon={faSmile as IconProp} size="lg" />
        </button>
      )}

      {/* Chat Box */}
      {showChat && (
        <div className="fixed bottom-0 right-0 w-full max-w-md bg-gray-800 border-t border-gray-700 z-50 shadow-xl">
          <div className="p-4 h-64 overflow-y-auto space-y-2 flex flex-col">
            {chatMessages.length > 0 ? (
              chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`text-sm p-2 rounded ${
                    msg.sender === 'me'
                      ? 'bg-blue-500 text-white self-end'
                      : 'bg-gray-700 text-gray-200 self-start'
                  }`}
                >
                  {msg.content}
                </div>
              ))
            ) : (
              <p className="text-gray-400">Start the conversation!</p>
            )}
          </div>
          <form
            className="flex items-center border-t border-gray-600 p-2"
            onSubmit={(e) => {
              e.preventDefault();
              debouncedSendMessage();
            }}
          >
            <input
              type="text"
              className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-l focus:outline-none"
              placeholder="Type your message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              type="submit"
              className="bg-pink-500 px-4 py-2 rounded-r text-white hover:bg-pink-600 transition"
            >
              <FontAwesomeIcon icon={faPaperPlane as IconProp} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProfileDetailPage;
