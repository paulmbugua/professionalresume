import React, { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.web';
import ProfileActions from '../components/ProfileActions.web';
import Footer from '../components/Footer.web';
import TutorReviews from '../components/TutorReviews.web';
import Spinner from '../components/Spinner.web';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faSmile } from '@fortawesome/free-solid-svg-icons';
import useProfileDetail, { LocalTutorProfile } from '@shared/hooks/useProfileDetail';
import { useShopContext } from '@shared/context';
import type { TutorProfile } from '@shared/types';
import debounce from 'lodash.debounce';
import { useProfileCard } from '@shared/hooks';

// Conversion function: explicitly build a TutorProfile object
const convertToTutorProfile = (profile: LocalTutorProfile): TutorProfile => ({
  id: profile.id,
  name: profile.name,
  user: profile.user ? profile.user : profile.id,
  pricing: {
    privateSession: String(profile.pricing.privateSession),
    groupSession: String(profile.pricing.groupSession),
    lecture: String(profile.pricing.lecture),
    workshop: String(profile.pricing.workshop),
  },
  gallery: (profile.gallery ?? []) as string[],
  recommended: (profile.recommended ?? []).map((rec: LocalTutorProfile) => ({
    id: rec.id,
    name: rec.name,
    user: rec.user ? rec.user : rec.id,
    pricing: {
      privateSession: String(rec.pricing.privateSession),
      groupSession: String(rec.pricing.groupSession),
      lecture: String(rec.pricing.lecture),
      workshop: String(rec.pricing.workshop),
    },
    gallery: (rec.gallery ?? []) as string[],
    rating: (rec as any).rating ?? 0,
    totalReviews: (rec as any).totalReviews ?? 0,
    category: rec.category,
    video: rec.video,
    role: rec.role,
    status: rec.status,
    description: rec.description,
    languages: rec.languages ?? [],
  })) as TutorProfile[],
  rating: (profile as any).rating ?? 0,
  totalReviews: (profile as any).totalReviews ?? 0,
  category: profile.category,
  video: profile.video,
  role: profile.role,
  status: profile.status,
  description: profile.description,
  languages: (profile.languages ?? []) as string[],
});

const ProfileDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { backendUrl, profile: myProfile, token } = useShopContext();

  const {
    tutorProfile,
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
  } = useProfileDetail(id as string, backendUrl);

  // Create debounced functions to limit rapid calls.
  const debouncedCreateSession = useMemo(
    () => debounce(() => handleCreateSession(navigate), 300),
    [handleCreateSession, navigate]
  );
  const debouncedSendMessage = useMemo(
    () => debounce(() => handleSendMessage(), 300),
    [handleSendMessage]
  );

  useEffect(() => {
    return () => {
      debouncedCreateSession.cancel();
      debouncedSendMessage.cancel();
    };
  }, [debouncedCreateSession, debouncedSendMessage]);

  // Compute a numeric profile unconditionally.
  const numericProfile = useMemo(() => {
    return tutorProfile
      ? convertToTutorProfile(tutorProfile)
      : ({
          id: '',
          name: '',
          user: '',
          pricing: { privateSession: '', groupSession: '', lecture: '', workshop: '' },
          gallery: [] as string[],
          recommended: [],
          rating: 0,
          totalReviews: 0,
          category: '',
          video: '',
          role: '',
          status: '',
          description: undefined,
          languages: [],
        } as TutorProfile);
  }, [tutorProfile]);

  // Always call useProfileCard unconditionally.
  const { ratingData } = useProfileCard(numericProfile, backendUrl, token);

  if (!tutorProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  const statusColor =
    tutorProfile.status === 'Online'
      ? 'bg-green-500'
      : tutorProfile.status === 'Busy'
        ? 'bg-yellow-500'
        : tutorProfile.status === 'Free'
          ? 'bg-purple-500'
          : 'bg-gray-500';

  return (
    <div className="bg-gray-900 text-white min-h-screen relative">
      {/* Navbar */}
      <div className="fixed top-0 left-0 w-full z-50">
        <Navbar onSearch={(query) => console.log(query)} />
      </div>

      {/* Main Layout */}
      <div className="pt-24 p-4 max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        {/* Left: Media */}
        <div className="lg:w-1/2 flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-lg shadow-xl">
            <img
              src={tutorProfile.gallery?.[0] || '/default-image.jpg'}
              alt={tutorProfile.name}
              className="w-full h-[500px] object-cover rounded-lg transition-transform transform hover:scale-105 duration-300 cursor-pointer"
              onClick={() => handleImageClick(tutorProfile.gallery?.[0] || '/default-image.jpg')}
            />
          </div>
          {tutorProfile.video && (
            <div className="relative overflow-hidden rounded-lg shadow-xl mt-4">
              <video
                src={tutorProfile.video}
                controls
                className="w-full h-48 object-cover rounded-lg transition-transform transform hover:scale-105 duration-300"
              ></video>
            </div>
          )}
        </div>
        {/* Right: Profile Info */}
        <div className="lg:w-1/2 bg-gray-800 p-6 rounded-lg shadow-lg space-y-6">
          <div className="flex items-center space-x-4">
            <img
              src={tutorProfile.gallery?.[0] || '/default-avatar.jpg'}
              alt={tutorProfile.name}
              className="h-16 w-16 rounded-full shadow-lg"
            />
            <div>
              <p className="text-lg font-bold">
                <span className="text-gray-500">Tutor Category:</span>
                <span className="ml-2 text-yellow-400">
                  {tutorProfile.category || 'Not specified'}
                </span>
              </p>
              <p className="text-gray-300">
                Speaks: {(numericProfile.languages ?? []).join(', ') || 'Not specified'}
              </p>
              {tutorProfile.status && (
                <span className={`text-xs px-2 py-1 rounded-full inline-block mt-2 ${statusColor}`}>
                  {tutorProfile.status}
                </span>
              )}
              {/* Instead of rendering TutorRating inline, we rely on TutorReviews below */}
            </div>
          </div>
          <button
            onClick={() => debouncedCreateSession()}
            className="bg-blue-500 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition duration-300 w-full"
          >
            Create Session with Tutor {tutorProfile.name}
          </button>
          <div className="space-y-1 text-sm text-gray-300">
            <p>
              Private Session (60mins):{' '}
              <span className="font-semibold text-white">
                {tutorProfile.pricing.privateSession || 'N/A'}{' '}
                <span className="text-sm text-gray-300">tokens</span>
              </span>
            </p>
            <p>
              Group Session (90mins):{' '}
              <span className="font-semibold text-white">
                {tutorProfile.pricing.groupSession || 'N/A'}{' '}
                <span className="text-sm text-gray-300">tokens</span>
              </span>
            </p>
            <p>
              Workshop (120mins):{' '}
              <span className="font-semibold text-white">
                {tutorProfile.pricing.workshop || 'N/A'}{' '}
                <span className="text-sm text-gray-300">tokens</span>
              </span>
            </p>
            <p>
              Lecture (180mins):{' '}
              <span className="font-semibold text-white">
                {tutorProfile.pricing.lecture || 'N/A'}{' '}
                <span className="text-sm text-gray-300">tokens</span>
              </span>
            </p>
            <p className="text-yellow-400">Please Note Session Attendance minutes</p>
          </div>
          <button
            className={`py-2 px-4 rounded-lg w-full mt-4 font-semibold ${statusColor} text-white`}
          >
            {tutorProfile.status === 'Online' ? "I'm available" : "I'm not available"}
          </button>
          <div>
            <ProfileActions recipientId={numericProfile.user} onSendMessage={toggleChat} />
          </div>
        </div>
      </div>

      {/* Details: About Me & Tutor Reviews */}
      <div className="mt-10 max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-pink-600 mb-4">About Me</h3>
          <p className="text-gray-300 mb-4">
            {tutorProfile.description?.bio || 'No bio available.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="text-lg font-semibold text-pink-500">Expertise</h4>
              {Array.isArray(tutorProfile.description?.expertise) &&
              tutorProfile.description.expertise.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {tutorProfile.description.expertise.map((skill, index) => (
                    <li key={index} className="text-gray-300 text-sm">
                      {skill}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-300 text-sm">Not specified</p>
              )}
            </div>
            <div>
              <h4 className="text-lg font-semibold text-pink-500">Teaching Style</h4>
              {Array.isArray(tutorProfile.description?.teachingStyle) &&
              tutorProfile.description.teachingStyle.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {tutorProfile.description.teachingStyle.map((style, index) => (
                    <li key={index} className="text-gray-300 text-sm">
                      {style}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-300 text-sm">Not specified</p>
              )}
            </div>
          </div>
        </div>
        <div>
          {/* Leverage TutorReviews to show rating and reviews */}
          <TutorReviews tutorId={tutorProfile.id} />
        </div>
      </div>

      {/* Recommended Tutors */}
      <div className="mt-10 max-w-6xl mx-auto px-4">
        <ProfileActions.Recommended
          recommended={numericProfile.recommended}
          statusColor={statusColor}
        />
        <div className="mt-4">
          <button className="text-pink-500 hover:underline" onClick={() => navigate(-1)}>
            &larr; Back
          </button>
        </div>
      </div>

      {/* Chat Toggle Button */}
      {myProfile?.id !== tutorProfile.id && (
        <div className="fixed bottom-20 right-6 z-50">
          <button
            className="bg-pink-500 text-white p-3 rounded-full shadow-lg hover:bg-pink-600 transition-colors"
            onClick={toggleChat}
          >
            <FontAwesomeIcon icon={faSmile} />
          </button>
        </div>
      )}

      {/* Chat Box */}
      {showChat && (
        <div className="fixed bottom-0 right-0 w-full max-w-md bg-gray-800 border-t border-gray-700 z-50 shadow-xl">
          <div className="p-4 h-64 overflow-y-auto space-y-2">
            {chatMessages.length > 0 ? (
              chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`text-sm p-2 rounded ${msg.sender === 'me' ? 'bg-blue-500 text-white self-end' : 'bg-gray-700 text-gray-200 self-start'}`}
                >
                  {msg.content}
                </div>
              ))
            ) : (
              <p className="text-gray-400">Start the conversation!</p>
            )}
          </div>
          <form
            className="flex items-center p-2 border-t border-gray-600"
            onSubmit={(e) => {
              e.preventDefault();
              debouncedSendMessage();
            }}
          >
            <input
              className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-l focus:outline-none"
              placeholder="Type your message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button
              type="submit"
              className="bg-pink-500 px-4 py-2 rounded-r text-white hover:bg-pink-600 transition-colors"
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </form>
        </div>
      )}

      {/* Image Modal Viewer */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center"
          onClick={closeModal}
        >
          <img
            src={selectedImage}
            alt="Zoomed view"
            className="max-h-[90vh] max-w-[90vw] rounded-lg"
          />
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ProfileDetailPage;
