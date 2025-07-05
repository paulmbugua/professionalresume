// /apps/web/src/components/CreateProfileForm.web.tsx
import React, { FC, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileForm } from '@mytutorapp/shared/hooks';

// Define union type for pricing keys
type PricingKeys = 'privateSession' | 'groupSession' | 'workshop' | 'lecture';

// Define token ranges once
const tokenRanges: Record<PricingKeys, { min: number; max: number }> = {
  privateSession: { min: 20, max: 150 },
  groupSession:   { min: 15, max: 80 },
  workshop:       { min: 15, max: 200 },
  lecture:        { min: 10, max: 50 },
};

// Explicitly type the pricing fields array
const pricingFields: PricingKeys[] = [
  'privateSession',
  'groupSession',
  'workshop',
  'lecture',
];

// If your shared types include an UploadAsset shape, import it; otherwise define:
interface UploadAsset {
  url: string;
}

// Type guard for UploadAsset
function isUploadAsset(obj: any): obj is UploadAsset {
  return obj != null && typeof obj.url === 'string';
}

const CreateProfileForm: FC = () => {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  // refs for HTML-native validation
  const nameRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const langSectionRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLSelectElement>(null);
  const paymentMethodRef = useRef<HTMLSelectElement>(null);
  const bankAccountRef = useRef<HTMLInputElement>(null);
  const bankCodeRef = useRef<HTMLInputElement>(null);
  const mpesaRef = useRef<HTMLInputElement>(null);

  const {
    role,
    name, setName,
    age, setAge,
    languages, handleLanguageSelect,
    ageGroup, handleAgeGroupChange,
    category, setCategory,
    bio, setBio,
    expertise, setExpertise,
    teachingStyle, setTeachingStyle,
    pricing, handlePricingChange,
    paymentMethod, setPaymentMethod,
    bankAccount, setBankAccount,
    bankCode, setBankCode,
    mpesaPhoneNumber, setMpesaPhoneNumber,
    images, setImages,
    videoPreview, handleVideoChange, handleRemoveVideo,
    loading, handleSubmit,
  } = useProfileForm({
    onSuccess: () => navigate('/'),
  });

  const onFormSubmit: React.FormEventHandler<HTMLFormElement> = e => {
    e.preventDefault();

    // 1) Native HTML5 validation + smooth scroll + native bubble
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

    // 2) Custom validations for controlled fields

    // Languages: at least one selected
    if (Object.values(languages).every(v => !v)) {
      langSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Tutor-only: category required
    if (role === 'tutor' && !category) {
      categoryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      categoryRef.current?.focus();
      return;
    }

    // Tutor-only: payment method required
    if (role === 'tutor' && !paymentMethod) {
      paymentMethodRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      paymentMethodRef.current?.focus();
      return;
    }

    // Tutor-only, bank details
    if (role === 'tutor' && paymentMethod === 'bank') {
      if (!bankAccount) {
        bankAccountRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        bankAccountRef.current?.focus();
        return;
      }
      if (!bankCode) {
        bankCodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        bankCodeRef.current?.focus();
        return;
      }
    }

    // Tutor-only, M-Pesa
    if (role === 'tutor' && paymentMethod === 'mpesa' && !mpesaPhoneNumber) {
      mpesaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      mpesaRef.current?.focus();
      return;
    }

    // 3) All good → call your hook’s submit
    handleSubmit(e);
  };

  return (
    <form
      ref={formRef}
      onSubmit={onFormSubmit}
      className="space-y-6 p-4 sm:p-6 bg-gray-900 rounded-lg shadow-lg max-w-lg mx-auto text-white relative"
    >
      <h2 className="text-2xl font-bold text-pink-400 text-center">
        Create Your Profile
      </h2>

      {/* Role display */}
      {role ? (
        <div className="space-y-2">
          <label className="text-base sm:text-lg text-gray-400">
            Your Role
          </label>
          <p className="w-full p-3 rounded bg-gray-800 text-white text-base sm:text-lg">
            {role}
          </p>
        </div>
      ) : (
        <p className="text-gray-400">Fetching your role...</p>
      )}

      {/* Name */}
      <input
        ref={nameRef}
        name="name"
        type="text"
        placeholder="Your Name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full p-3 rounded bg-gray-800 text-white text-base sm:text-lg"
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
        className="w-full p-3 rounded bg-gray-800 text-white text-base sm:text-lg"
        min={role === 'tutor' ? 18 : 5}
        required
      />

      {/* Language Selection */}
      <div ref={langSectionRef} className="space-y-2 mt-4">
        <label className="text-base sm:text-lg text-gray-400">
          Select Languages You Speak
        </label>
        <div className="flex gap-2 flex-wrap">
          {Object.keys(languages).map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguageSelect(lang)}
              className={`p-2 rounded border ${
                languages[lang]
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-800 text-gray-400'
              } text-base sm:text-lg`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Student-specific fields */}
      {role === 'student' && (
        <>
          <h3 className="text-base sm:text-lg font-semibold text-gray-400 mt-4">
            Age Group
          </h3>
          <div className="flex flex-wrap gap-3">
            {[
              'Pre-Primary',
              'Lower Primary',
              'Upper Primary',
              'University/College',
              'Adults',
            ].map(group => (
              <button
                key={group}
                type="button"
                className={`p-2 rounded-lg ${
                  ageGroup.includes(group)
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-800 text-gray-300'
                } text-base sm:text-lg`}
                onClick={() => handleAgeGroupChange(group)}
              >
                {group}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Tutor-specific fields */}
      {role === 'tutor' && (
        <>
          {/* Category */}
          <div className="space-y-2">
            <label className="text-base sm:text-lg text-gray-400">
              Select Subject or Skill Category
            </label>
            <select
              ref={categoryRef}
              name="category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full p-3 rounded bg-gray-800 text-white text-base sm:text-lg"
              required
            >
              <option value="" disabled>
                Select a category
              </option>
              <option value="Math Tutor">Math Tutor</option>
              <option value="Sciences">Sciences</option>
              <option value="Programming">Programming</option>
              <option value="Art & Design">Art & Design</option>
              <option value="Languages">Languages</option>
              <option value="Wellness">Wellness</option>
            </select>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-base sm:text-lg text-gray-400">
              Payment Method
            </label>
            <select
              ref={paymentMethodRef}
              name="paymentMethod"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full p-3 rounded bg-gray-800 text-white text-base sm:text-lg"
              required
            >
              <option value="" disabled>
                Select payment method
              </option>
              <option value="bank">Bank</option>
              <option value="mpesa">M-Pesa</option>
            </select>
          </div>

          {/* Bank Details */}
          {paymentMethod === 'bank' && (
            <>
              <div className="space-y-2">
                <label className="text-base sm:text-lg text-gray-400">
                  Bank Account Details
                </label>
                <input
                  ref={bankAccountRef}
                  name="bankAccount"
                  type="text"
                  placeholder="Enter your Bank Account Number"
                  value={bankAccount}
                  onChange={e => setBankAccount(e.target.value)}
                  className="w-full p-3 rounded bg-gray-800 text-white text-base sm:text-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-base sm:text-lg text-gray-400">
                  Bank Code
                </label>
                <input
                  ref={bankCodeRef}
                  name="bankCode"
                  type="text"
                  placeholder="Enter your Bank Code"
                  value={bankCode}
                  onChange={e => setBankCode(e.target.value)}
                  className="w-full p-3 rounded bg-gray-800 text-white text-base sm:text-lg"
                  required
                />
              </div>
            </>
          )}

          {/* M-Pesa Details */}
          {paymentMethod === 'mpesa' && (
            <div className="space-y-2">
              <label className="text-base sm:text-lg text-gray-400">
                M-Pesa Phone Number
              </label>
              <input
                ref={mpesaRef}
                name="mpesaPhoneNumber"
                type="text"
                placeholder="+2547XXXXXXXX"
                value={mpesaPhoneNumber}
                onChange={e => setMpesaPhoneNumber(e.target.value)}
                className="w-full p-3 rounded bg-gray-800 text-white text-base sm:text-lg"
                required
              />
            </div>
          )}

          {/* Age Groups You Teach */}
          <div className="space-y-2">
            <label className="text-base sm:text-lg font-semibold text-gray-400">
              Age Groups You Teach
            </label>
            <div className="flex flex-wrap gap-3">
              {[
                'Pre-Primary',
                'Lower Primary',
                'Upper Primary',
                'University/College',
                'Adults',
              ].map(group => (
                <button
                  key={group}
                  type="button"
                  className={`p-2 rounded-lg ${
                    ageGroup.includes(group)
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-800 text-gray-300'
                  } text-base sm:text-lg`}
                  onClick={() => handleAgeGroupChange(group)}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          {/* Teaching Styles */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-400 mb-2">
              Teaching Styles
            </h3>
            <div className="flex flex-wrap gap-3">
              {['One-on-One', 'Group', 'Workshop', 'Lecture'].map(style => (
                <button
                  key={style}
                  type="button"
                  className={`p-2 rounded-lg ${
                    teachingStyle.includes(style)
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-800 text-gray-300'
                  } text-base sm:text-lg`}
                  onClick={() =>
                    setTeachingStyle(prev =>
                      prev.includes(style)
                        ? prev.filter(item => item !== style)
                        : [...prev, style]
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
            className="w-full p-3 rounded bg-gray-800 text-white text-base sm:text-lg"
            rows={3}
          />

          {/* Expertise */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-400 mb-2">
              Expertise
            </h3>
            <div className="flex flex-wrap gap-3">
              {[
                'Exam Prep',
                'Skill Building',
                'Homework Help',
                'Career Guidance',
              ].map(skill => (
                <button
                  key={skill}
                  type="button"
                  className={`p-2 rounded-lg ${
                    expertise.includes(skill)
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-800 text-gray-300'
                  } text-base sm:text-lg`}
                  onClick={() =>
                    setExpertise(prev =>
                      prev.includes(skill)
                        ? prev.filter(item => item !== skill)
                        : [...prev, skill]
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
            <label className="text-base sm:text-lg text-gray-400">
              Set Your Rates (Tokens per Session @10Shs/Token)
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              {pricingFields.map(field => {
                const { min, max } = tokenRanges[field];
                return (
                  <div key={field} className="flex flex-col">
                    <label className="text-sm sm:text-base text-gray-300">
                      {field.replace(/([A-Z])/g, ' $1')} (Min: {min} | Max: {max})
                    </label>
                    <input
                      name={field}
                      type="number"
                      placeholder={`Enter ${field.replace(
                        /([A-Z])/g,
                        ' $1'
                      )} Tokens`}
                      value={(pricing as Record<PricingKeys, string>)[field] || ''}
                      onChange={e => handlePricingChange(field, e.target.value)}
                      className="p-2 sm:p-3 rounded-lg bg-gray-800 text-gray-300 focus:outline-none focus:ring-2 focus:ring-pink-500 text-sm sm:text-base"
                      min={min}
                      max={max}
                      required
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upload Profile Image */}
          <label htmlFor="image1" className="space-y-2 cursor-pointer">
            <span className="text-base sm:text-lg text-gray-400">
              Upload Profile Image
            </span>
            <div className="w-20 h-20 sm:w-24 sm:h-24 border flex items-center justify-center">
              {(() => {
                const first = images[0];
                let src: string;
                if (first instanceof File) {
                  src = URL.createObjectURL(first);
                } else if (typeof first === 'string') {
                  src = first;
                } else if (isUploadAsset(first)) {
                  src = first.url;
                } else {
                  src = '/upload_placeholder.png';
                }
                return <img src={src} alt="" className="w-full h-full object-cover" />;
              })()}
            </div>
            <input
              id="image1"
              type="file"
              hidden
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  setImages([file]);
                }
              }}
            />
          </label>

          {/* Introduction Video */}
          <div className="space-y-2">
            <label className="text-base sm:text-lg text-gray-400">
              Introduction Video
            </label>
            <div className="flex items-center justify-center sm:justify-start gap-4">
              {videoPreview ? (
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-gray-800 rounded-lg overflow-hidden">
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
                  className="flex items-center justify-center w-28 h-28 sm:w-32 sm:h-32 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700"
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
        className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-lg text-base sm:text-lg"
        disabled={loading}
      >
        {loading ? 'Creating Profile...' : 'Create Profile'}
      </button>
    </form>
  );
};

export default CreateProfileForm;
