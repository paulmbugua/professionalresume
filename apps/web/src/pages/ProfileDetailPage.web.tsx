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

const defaultTutorProfile: TutorProfile = {
  id: '',
  user_id: '',
  user: '',
  name: '',
  category: '',
  gallery: [],
  video: '',
  role: undefined,
  status: undefined,
  lastOnline: undefined,
  description: {},
  recommended: [],
  languages: [],
  pricing: { privateSession: '0', groupSession: '0', lecture: '0', workshop: '0' },
  rating: 0,
  totalReviews: 0,
};

const ProfileDetailPage: React.FC = () => {
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

  const profile: TutorProfile = useMemo(() => {
    const tp = tutorProfile as Partial<TutorProfile> | undefined;
    return tp && tp.id ? (tp as TutorProfile) : defaultTutorProfile;
  }, [tutorProfile]);

  useProfileCard(profile, backendUrl, token);

  const pickDefaultSession = (pricing?: Record<string, number | string>) => {
    if (!pricing) return { type: '', cost: '' };
    const entries = Object.entries(pricing);
    if (!entries.length) return { type: '', cost: '' };
    const nonZero = entries.find(([, v]) => Number(v) > 0) ?? entries[0];
    const [type, price] = nonZero;
    return { type, cost: String(price ?? '') };
  };

  const onCreateSession = useCallback(() => {
    const subject = profile.category || 'General';
    const { type, cost } = pickDefaultSession(profile.pricing);

    const params = new URLSearchParams();
    params.set('tab', 'sessions');
    params.set('action', 'createSession');
    params.set('tutorId', (profile.user_id || profile.user) ?? '');
    params.set('tutorName', profile.name ?? '');
    params.set('subject', subject);
    if (type) params.set('sessionType', type);
    if (cost) params.set('sessionCost', cost);
    if (profile.pricing) params.set('pricing', JSON.stringify(profile.pricing));

    navigate(`/account?${params.toString()}`);
  }, [navigate, profile]);

  if (loading) {
    return (
      <div className="min-h-screen app-body flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!tutorProfile) {
    return (
      <div className="min-h-screen app-body flex items-center justify-center">
        <p className="text-darkText dark:text-darkTextPrimary">Tutor profile not found.</p>
      </div>
    );
  }

  const statusColor =
    profile.status === 'Online' ? 'bg-green-500' :
    profile.status === 'Busy' ? 'bg-yellow-500' :
    profile.status === 'Free' ? 'bg-purple-500' :
    'bg-gray-500';

  const languages     = profile.languages ?? [];
  const expertise     = profile.description?.expertise ?? [];
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
    <div className="min-h-screen app-body">
      <div className="fixed top-0 left-0 w-full z-50">
        <Navbar />
      </div>

      <div className="pt-24 md:pt-16 px-4 lg:px-8 max-w-7xl mx-auto space-y-12 pb-20">

        {/* Top Section */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left column → Gallery + (small rectangular) Video stacked */}
          <div className="w-full md:w-1/2 lg:w-2/5 space-y-4">
            {/* Gallery image */}
            <img
              src={profile.gallery[0] ? resolveAsset(profile.gallery[0]) : '/default-image.jpg'}
              alt={profile.name}
              className="w-full h-80 md:h-[400px] object-cover rounded-lg shadow-lg cursor-pointer ring-1 ring-gray-200 dark:ring-darkCard"
              onClick={() => handleImageClick(profile.gallery[0] || '')}
            />

            {/* Intro video (small, rectangular, aligned under gallery) */}
            {typeof profile.video === 'string' && profile.video.trim() !== '' && (
              <video
                key={profile.video}
                src={resolveAsset(profile.video)}
                controls
                playsInline
                className="w-full h-40 md:h-44 object-cover rounded-lg shadow-lg ring-1 ring-gray-200 dark:ring-darkCard"
              />
            )}
          </div>

          {/* Right column → profile info */}
          <div className="w-full md:flex-1 bg-white dark:bg-darkCard p-6 rounded-lg shadow-lg ring-1 ring-gray-200 dark:ring-darkCard space-y-6">
            <div className="flex items-center space-x-4">
              <img
                src={profile.gallery[0] ? resolveAsset(profile.gallery[0]) : '/default-avatar.jpg'}
                alt={profile.name}
                className="h-20 w-20 rounded-full shadow-md object-cover ring-1 ring-gray-200 dark:ring-darkCard"
              />
              {/* Name, Category, Speaks */}
              <div>
                <h2 className="text-2xl font-semibold">{profile.name}</h2>
                <p className="text-sm text-darkTextSecondary dark:text-darkTextSecondary">
                  <span className="font-medium text-darkText dark:text-darkTextPrimary">Category:</span>{' '}
                  <span className="text-primary font-medium">{profile.category || 'N/A'}</span>
                </p>
                <p className="text-sm text-darkTextSecondary dark:text-darkTextSecondary">
                  <span className="font-medium text-darkText dark:text-darkTextPrimary">Speaks:</span>{' '}
                  <span className="text-darkText dark:text-darkTextPrimary">{languages.join(', ') || 'N/A'}</span>
                </p>
                {profile.status && (
                  <span className={`inline-block mt-2 px-3 py-1 text-xs rounded-full text-white ${statusColor}`}>
                    {profile.status}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onCreateSession}
              className="w-full bg-primary hover:bg-secondary text-white py-2 rounded-lg font-medium transition"
            >
              Create Session
            </button>

            <div className="space-y-1 text-sm">
              {pricingSections.map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-darkText dark:text-darkTextPrimary">{label}</span>
                  <span className="font-semibold text-darkText dark:text-darkTextPrimary">{val} tokens</span>
                </div>
              ))}
            </div>

            <ProfileActions
              recipientId={(profile.user_id || profile.user) as string}
              onSendMessage={toggleChat}
            />
          </div>
        </div>

        {/* About & Reviews */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-darkCard p-6 rounded-lg shadow-lg ring-1 ring-gray-200 dark:ring-darkCard space-y-4">
            <h3 className="text-xl font-semibold text-primary">About Me</h3>
            <p className="text-darkText dark:text-darkTextPrimary">
              {profile.description?.bio || 'No bio available.'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {aboutSections.map(([title, items]) => (
                <div key={title}>
                  <h4 className="text-lg font-semibold text-primary">{title}</h4>
                  {items.length > 0 ? (
                    items.map((it, i) => (
                      <p
                        key={i}
                        className="text-darkText dark:text-darkTextPrimary text-sm"
                      >
                        {it}
                      </p>
                    ))
                  ) : (
                    <p className="text-mutedGray dark:text-darkTextSecondary text-sm">
                      Not specified
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-darkCard p-6 rounded-lg shadow-lg ring-1 ring-gray-200 dark:ring-darkCard">
            <TutorReviews tutorId={(profile.user_id || profile.user) as string} />
          </div>
        </div>

        {/* Recommended Tutors */}
        <div className="bg-white dark:bg-darkCard p-6 rounded-lg shadow-lg ring-1 ring-gray-200 dark:ring-darkCard space-y-4">
          <ProfileActions.Recommended
            recommended={profile.recommended}
            statusColor={statusColor}
          />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProfileDetailPage;
