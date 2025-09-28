import React, { FC, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileForm } from '@mytutorapp/shared/hooks';

/* ───────────────────────── Minimal subjects (major categories) ───────────────────────── */
const SUBJECT_CATEGORIES = [
  'Mathematics',
  'Sciences',
  'Languages',
  'Arts',
  'Social Studies',
  'Technology & Computing',
  'Business & Economics',
  'Wellness & PE',
] as const;
type SubjectCategory = typeof SUBJECT_CATEGORIES[number];

/* ───────────────────────── Types for selects ───────────────────────── */
type RegionKey =
  | 'africa'
  | 'europe'
  | 'asia'
  | 'south-america'
  | 'north-america'
  | 'oceania'
  | 'middle-east';

type CountryCode =
  | 'ke' | 'ng' | 'za' | 'gh' | 'ug' | 'tz' | 'eg' | 'ma'
  | 'uk' | 'fr' | 'de' | 'es' | 'it' | 'pl' | 'nl' | 'ie' | 'pt'
  | 'in' | 'cn' | 'jp' | 'kr'
  | 'br' | 'ar' | 'cl' | 'co'
  | 'us' | 'ca' | 'mx'
  | 'au' | 'nz'
  | 'qa' | 'sa' | 'ae' | 'kw' | 'bh' | 'om' | 'jo' | 'lb';

type BandKey =
  | 'preprimary'
  | 'primary'
  | 'lower-secondary'
  | 'upper-secondary'
  | 'sixth-form'
  | 'tvet'
  | 'tertiary'
  | 'adults';

type GradeBand = { key: BandKey; label: string };

const CreateProfileForm: FC = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const {
    role,
    // basics
    name, setName,
    age, setAge,
    languages, handleLanguageSelect,
    ageGroup, handleAgeGroupChange,
    category, setCategory,
    bio, setBio,
    expertise, setExpertise,
    teachingStyle, setTeachingStyle,
    pricing, handlePricingChange,

    // media
    images, setImages,
    videoPreview, handleVideoChange, handleRemoveVideo,

    // payout prefs
    payoutCurrency,
    payoutMethod, setPayoutMethod,
    wiseEmail, setWiseEmail,
    mpesaPhoneNumber, setMpesaPhoneNumber,

    // NEW geo+band (from hook)
    region, setRegion,
    country, setCountry,
    bandKey, setBandKey,
    bands, countries,

    // submit
    loading, handleSubmit, step,
  } = useProfileForm({
    onSuccess: () => navigate('/'),
  });

  const inputBase =
    'w-full p-3 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821] text-[#0d141c] dark:text-darkTextPrimary';

  const chipOn = 'bg-pink-500 text-white border-pink-500';
  const chipOff = 'bg-[#e7edf4] text-[#49739c] dark:bg-[#172534] dark:text-darkTextSecondary border-transparent';

  const onFormSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();

    const form = formRef.current;
    if (form && !form.checkValidity()) {
      const firstInvalid = form.querySelector(':invalid') as HTMLElement & {
        reportValidity?: () => boolean;
      };
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
        firstInvalid.reportValidity?.();
      }
      return;
    }

    // Basic guards
    if (Object.values(languages).every(v => !v)) {
      alert('Please select at least one language you speak.');
      return;
    }
    if (role === 'tutor' && !category) {
      alert('Please select a Subject Category.');
      return;
    }
    if (role === 'tutor' && !bandKey) {
      alert('Please choose your primary Grade Band.');
      return;
    }
    if (role === 'tutor' && payoutMethod === 'mpesa' && !mpesaPhoneNumber) {
      alert('Please provide your M-Pesa phone number for KES payouts.');
      return;
    }
    if (role === 'tutor' && payoutMethod === 'wise' && !wiseEmail) {
      alert('Please provide your Wise account email for USD payouts.');
      return;
    }

    // Delegate to hook
    handleSubmit(e);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkBg py-10 sm:py-16 px-3 sm:px-4">
      <form
        ref={formRef}
        onSubmit={onFormSubmit}
        className="space-y-6 p-4 sm:p-6 rounded-2xl border border-[#cedbe8] 
                   dark:border-darkCard bg-white dark:bg-[#0f1821] shadow-sm 
                   max-w-2xl mx-auto text-[#0d141c] dark:text-darkTextPrimary"
      >
        <h2 className="text-2xl font-bold text-center">Create Your Profile</h2>

        {/* Background video upload notice */}
        {step === 'bg-video' && (
          <div className="text-sm text-[#49739c] dark:text-darkTextSecondary">
            Uploading your intro video in the background… you can continue using the app.
          </div>
        )}

        {/* Role display */}
        {role ? (
          <div className="space-y-2">
            <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">Your Role</label>
            <p className={inputBase}>{role}</p>
          </div>
        ) : (
          <p className="text-[#49739c] dark:text-darkTextSecondary">Fetching your role...</p>
        )}

        {/* Name */}
        <input
          name="name"
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={e => setName(e.target.value)}
          className={inputBase}
          required
        />

        {/* Age */}
        <input
          name="age"
          type="number"
          placeholder={`Age (${role === 'tutor' ? '18+' : '5+'})`}
          value={age}
          onChange={e => setAge(e.target.value)}
          className={inputBase}
          min={role === 'tutor' ? 18 : 5}
          required
        />

        {/* Language Selection */}
        <div className="space-y-2 mt-4">
          <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
            Select Languages You Speak
          </label>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(languages).map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => handleLanguageSelect(lang)}
                className={`p-2 rounded border text-sm sm:text-base ${languages[lang] ? chipOn : chipOff}`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Student-only Age Group */}
        {role === 'student' && (
          <>
            <h3 className="text-base sm:text-lg font-semibold text-[#49739c] dark:text-darkTextSecondary mt-4">
              Age Group
            </h3>
            <div className="flex flex-wrap gap-3">
              {['Pre-Primary','Lower Primary','Upper Primary','University/College','Adults'].map(group => (
                <button
                  key={group}
                  type="button"
                  className={`p-2 rounded-lg text-sm sm:text-base ${ageGroup.includes(group) ? chipOn : chipOff}`}
                  onClick={() => handleAgeGroupChange(group)}
                >
                  {group}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Tutor-only */}
        {role === 'tutor' && (
          <>
            {/* Geography (Region → Country) */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                  Region *
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as RegionKey)}
                  className={inputBase}
                  required
                >
                  <option value="africa">Africa</option>
                  <option value="europe">Europe</option>
                  <option value="asia">Asia</option>
                  <option value="middle-east">Middle East</option>
                  <option value="north-america">North America</option>
                  <option value="south-america">South America</option>
                  <option value="oceania">Oceania</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                  Country *
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value as CountryCode)}
                  className={inputBase}
                  required
                >
                  {countries.map(c => (
                    <option key={c.code} value={c.code}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject Category (reuses existing `category`) */}
            <div className="space-y-2">
              <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                Subject Category *
              </label>
              <select
                name="category"
                value={category}
                onChange={e => setCategory(e.target.value as SubjectCategory)}
                className={inputBase}
                required
              >
                <option value="" disabled>Select a category</option>
                {SUBJECT_CATEGORIES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Primary Grade Band (country-specific) */}
            <div className="space-y-2">
              <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                Primary Grade Band *
              </label>
              <select
                value={bandKey}
                onChange={e => setBandKey(e.target.value as BandKey)}
                className={inputBase}
                required
              >
                <option value="" disabled>Select grade band…</option>
                {bands.map((b: GradeBand) => (
                  <option key={b.key} value={b.key}>{b.label}</option>
                ))}
              </select>
              <p className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                This helps learners find you by country and level (e.g., “Kenya · Junior School”).
              </p>
            </div>

            {/* Payout Preferences */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-base sm:text-lg font-semibold text-[#49739c] dark:text-darkTextSecondary">
                Payout Preferences
              </h3>

              {/* Method */}
              <div>
                <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                  Payout Method
                </label>
                <select
                  name="payoutMethod"
                  value={payoutMethod}
                  onChange={e => setPayoutMethod(e.target.value as 'wise' | 'mpesa')}
                  className={inputBase}
                  required
                >
                  <option value="wise">Wise (USD)</option>
                  <option value="mpesa">M-Pesa (KES)</option>
                </select>
              </div>

              {/* Currency (read-only) */}
              <div>
                <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                  Payout Currency
                </label>
                <input className={inputBase} value={payoutCurrency} readOnly />
                <p className="text-xs mt-1 text-[#49739c] dark:text-darkTextSecondary">
                  Wise pays in USD to your Wise account. M-Pesa payouts settle in KES.
                </p>
              </div>

              {/* Method details */}
              {payoutMethod === 'wise' && (
                <div>
                  <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                    Wise account email
                  </label>
                  <input
                    type="email"
                    placeholder="you@yourdomain.com"
                    value={wiseEmail}
                    onChange={e => setWiseEmail(e.target.value)}
                    className={inputBase}
                    required
                  />
                </div>
              )}

              {payoutMethod === 'mpesa' && (
                <div className="space-y-2">
                  <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                    M-Pesa Phone Number
                  </label>
                  <input
                    name="mpesaPhoneNumber"
                    type="text"
                    placeholder="+2547XXXXXXXX"
                    value={mpesaPhoneNumber}
                    onChange={e => setMpesaPhoneNumber(e.target.value)}
                    className={inputBase}
                    required
                  />
                </div>
              )}
            </div>

            {/* Teaching Styles */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-[#49739c] dark:text-darkTextSecondary mb-2">
                Teaching Styles
              </h3>
              <div className="flex flex-wrap gap-3">
                {['One-on-One', 'Group', 'Workshop', 'Lecture'].map(style => (
                  <button
                    key={style}
                    type="button"
                    className={`p-2 rounded-lg text-sm sm:text-base ${teachingStyle.includes(style) ? chipOn : chipOff}`}
                    onClick={() =>
                      setTeachingStyle(prev =>
                        prev.includes(style) ? prev.filter(item => item !== style) : [...prev, style]
                      )
                    }
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            {/* Bio */}
            <textarea
              name="bio"
              placeholder="A short bio about yourself..."
              value={bio}
              onChange={e => setBio(e.target.value)}
              className={`${inputBase} !min-h-[96px]`}
              rows={3}
            />

            {/* Expertise */}
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-[#49739c] dark:text-darkTextSecondary mb-2">
                Expertise
              </h3>
              <div className="flex flex-wrap gap-3">
                {['Exam Prep','Skill Building','Homework Help','Career Guidance'].map(skill => (
                  <button
                    key={skill}
                    type="button"
                    className={`p-2 rounded-lg text-sm sm:text-base ${expertise.includes(skill) ? chipOn : chipOff}`}
                    onClick={() =>
                      setExpertise(prev =>
                        prev.includes(skill) ? prev.filter(item => item !== skill) : [...prev, skill]
                      )
                    }
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                Set Your Rates (1 token = $1 USD)
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                {([
                  { key: 'privateSession', min: 5, max: 50 },
                  { key: 'groupSession',   min: 5, max: 50 },
                  { key: 'workshop',       min: 5, max: 100 },
                  { key: 'lecture',        min: 5, max: 100 },
                ] as const).map(({ key, min, max }) => (
                  <div key={key} className="flex flex-col">
                    <label className="text-sm sm:text-base text-[#49739c] dark:text-darkTextSecondary">
                      {key.replace(/([A-Z])/g, ' $1')} (Min: {min} | Max: {max})
                    </label>
                    <input
                      name={key}
                      type="number"
                      placeholder={`Enter ${key.replace(/([A-Z])/g, ' $1')} Tokens`}
                      value={(pricing as any)[key] || ''}
                      onChange={e => handlePricingChange(key as any, e.target.value)}
                      className={`${inputBase} focus:outline-none focus:ring-2 focus:ring-pink-500`}
                      min={min}
                      max={max}
                      required
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                Tip: For group pricing, use price <strong>per learner</strong>.
              </p>
            </div>

            {/* Profile Image */}
            <label htmlFor="image1" className="space-y-2 cursor-pointer">
              <span className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                Upload Profile Image
              </span>
              <div className="w-20 h-20 sm:w-24 sm:h-24 border border-[#cedbe8] dark:border-darkCard rounded-lg overflow-hidden bg-slate-50 dark:bg-[#0f1821] flex items-center justify-center">
                {(() => {
                  const first = (images as any[])[0];
                  let src: string;
                  if (first instanceof File) src = URL.createObjectURL(first);
                  else if (typeof first === 'string') src = first;
                  else if (first && typeof first === 'object' && 'url' in first) src = (first as any).url;
                  else src = '/upload_placeholder.png';
                  return <img src={src} alt="" className="w-full h-full object-cover" />;
                })()}
              </div>
              <input
                id="image1"
                type="file"
                accept="image/*"
                hidden
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) (setImages as any)([file]);
                }}
              />
            </label>

            {/* Intro Video */}
            <div className="space-y-2">
              <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                Introduction Video
              </label>
              <div className="flex items-center justify-center sm:justify-start gap-4">
                {videoPreview ? (
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-slate-50 dark:bg-[#0f1821] rounded-lg overflow-hidden">
                    <video src={videoPreview} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={handleRemoveVideo}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      title="Remove video"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="video-upload"
                    className="flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 bg-[#e7edf4] dark:bg-[#172534] rounded-lg cursor-pointer hover:opacity-90"
                    title="Upload video"
                  >
                    <span>Upload Video</span>
                  </label>
                )}
                <input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      (handleVideoChange as any)(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>
          </>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-[#3d99f5] hover:brightness-110 text-white py-3 rounded-lg text-base sm:text-lg"
          disabled={loading}
        >
          {loading
            ? (step === 'uploading' ? 'Uploading images…'
              : step === 'creating' ? 'Creating profile…'
              : 'Creating profile…')
            : 'Create Profile'}
        </button>
      </form>
    </div>
  );
};

export default CreateProfileForm;
