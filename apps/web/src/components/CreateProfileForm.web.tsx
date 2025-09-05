// apps/web/src/components/CreateProfileForm.web.tsx
import React, { FC, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileForm } from '@mytutorapp/shared/hooks';

// Pricing keys + ranges (tokens == USD)
type PricingKeys = 'privateSession' | 'groupSession' | 'workshop' | 'lecture';
const tokenRanges: Record<PricingKeys, { min: number; max: number }> = {
  privateSession: { min: 5, max: 50 },
  groupSession:   { min: 5, max: 50 },   // intended per learner
  workshop:       { min: 5, max: 100 },  // one-to-many, intensive
  lecture:        { min: 5, max: 100 },  // one-to-many, lower interaction
};
const pricingFields: PricingKeys[] = ['privateSession', 'groupSession', 'workshop', 'lecture'];

// If your shared types include an UploadAsset, use it; otherwise:
interface UploadAsset { url: string }
function isUploadAsset(obj: any): obj is UploadAsset {
  return obj != null && typeof obj.url === 'string';
}

const CreateProfileForm: FC = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  // refs for quick scroll-to-invalid behaviors
  const nameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const langSectionRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const mpesaRef = useRef<HTMLInputElement>(null);
  const wiseRef = useRef<HTMLInputElement>(null);

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

    // payout prefs (✅ currency is derived from method in the hook)
    payoutCurrency,
    payoutMethod, setPayoutMethod,
    wiseEmail, setWiseEmail,
    mpesaPhoneNumber, setMpesaPhoneNumber,

    // submit
    loading, handleSubmit, step,
  } = useProfileForm({
    onSuccess: () => navigate('/'),
  });

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

    // custom checks
    if (Object.values(languages).every(v => !v)) {
      langSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (role === 'tutor' && !category) {
      categoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      categoryRef.current?.focus();
      return;
    }
    if (role === 'tutor' && payoutMethod === 'mpesa' && !mpesaPhoneNumber) {
      mpesaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mpesaRef.current?.focus();
      return;
    }
    if (role === 'tutor' && payoutMethod === 'wise' && !wiseEmail) {
      wiseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      wiseRef.current?.focus();
      return;
    }

    handleSubmit(e);
  };

  const inputBase =
    'w-full p-3 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821] text-[#0d141c] dark:text-darkTextPrimary';

  const chipOn = 'bg-pink-500 text-white border-pink-500';
  const chipOff = 'bg-[#e7edf4] text-[#49739c] dark:bg-[#172534] dark:text-darkTextSecondary border-transparent';

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
          ref={nameRef}
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
          ref={ageRef}
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
        <div ref={langSectionRef} className="space-y-2 mt-4">
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

        {/* Student-only */}
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
            {/* Category */}
            <div className="space-y-2">
              <label className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                Select Subject or Skill Category
              </label>
              <select
                ref={categoryRef}
                name="category"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className={inputBase}
                required
              >
                <option value="" disabled>Select a category</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Sciences">Sciences</option>
                <option value="Programming">Programming</option>
                <option value="Art & Design">Art & Design</option>
                <option value="Languages">Languages</option>
                <option value="Wellness">Wellness</option>
              </select>
            </div>

            {/* Payout Preferences */}
            <div className="space-y-3 border-t pt-4">
              <h3 className="text-base sm:text-lg font-semibold text-[#49739c] dark:text-darkTextSecondary">
                Payout Preferences
              </h3>

              {/* Method (Wise or M-Pesa) */}
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

              {/* Currency (derived from method, read-only) */}
              <div>
                <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                  Payout Currency
                </label>
                <input
                  className={inputBase}
                  value={payoutCurrency}
                  readOnly
                />
                <p className="text-xs mt-1 text-[#49739c] dark:text-darkTextSecondary">
                  Wise pays out in USD to your Wise account. M-Pesa payouts settle in KES; FX conversion happens at payout time.
                </p>
              </div>

              {/* Method details */}
              {payoutMethod === 'wise' && (
                <div>
                  <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                    Wise account email
                  </label>
                  <input
                    ref={wiseRef}
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
                    ref={mpesaRef}
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

            {/* Age Groups You Teach */}
            <div className="space-y-2">
              <label className="text-base sm:text-lg font-semibold text-[#49739c] dark:text-darkTextSecondary">
                Age Groups You Teach
              </label>
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
                {pricingFields.map(field => {
                  const { min, max } = tokenRanges[field];
                  return (
                    <div key={field} className="flex flex-col">
                      <label className="text-sm sm:text-base text-[#49739c] dark:text-darkTextSecondary">
                        {field.replace(/([A-Z])/g, ' $1')} (Min: {min} | Max: {max})
                      </label>
                      <input
                        name={field}
                        type="number"
                        placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1')} Tokens`}
                        value={(pricing as Record<PricingKeys, string>)[field] || ''}
                        onChange={e => handlePricingChange(field, e.target.value)}
                        className={`${inputBase} focus:outline-none focus:ring-2 focus:ring-pink-500`}
                        min={min}
                        max={max}
                        required
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                Tip: For group pricing, we recommend entering the price <strong>per learner</strong>. If you price per session instead, multiply by your target class size.
              </p>
            </div>

            {/* Upload Profile Image */}
            <label htmlFor="image1" className="space-y-2 cursor-pointer">
              <span className="text-base sm:text-lg text-[#49739c] dark:text-darkTextSecondary">
                Upload Profile Image
              </span>
              <div className="w-20 h-20 sm:w-24 sm:h-24 border border-[#cedbe8] dark:border-darkCard rounded-lg overflow-hidden bg-slate-50 dark:bg-[#0f1821] flex items-center justify-center">
                {(() => {
                  const first = images[0];
                  let src: string;
                  if (first instanceof File) src = URL.createObjectURL(first);
                  else if (typeof first === 'string') src = first;
                  else if (isUploadAsset(first)) src = first.url;
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
                  if (file) setImages([file]);
                }}
              />
            </label>

            {/* Introduction Video */}
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
                      handleVideoChange(e.target.files[0]);
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
