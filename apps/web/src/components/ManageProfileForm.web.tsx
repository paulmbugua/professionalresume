import React, { FC, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import useManageProfileForm from '@mytutorapp/shared/hooks/useManageProfileForm';

const STATUS_OPTIONS = [
  { value: 'Online',  label: 'Online' },
  { value: 'Offline', label: 'Offline' },
  { value: 'Busy',    label: 'Busy' },
  { value: 'Free',    label: 'Free Session' },
  { value: 'New',     label: 'New' },
];

const CATEGORY_OPTIONS = [
  'Math Tutor',
  'Sciences',
  'Programming',
  'Art & Design',
  'Languages',
  'Wellness',
];

const AGE_GROUPS = [
  'Pre-Primary',
  'Lower Primary',
  'Upper Primary',
  'University/College',
  'Adults',
];

const LANGUAGES = ['English', 'Swahili', 'French', 'Spanish', 'German'];

type PricingKey = 'privateSession' | 'groupSession' | 'lecture' | 'workshop';
const PRICING_KEYS: PricingKey[] = ['privateSession', 'groupSession', 'lecture', 'workshop'];
const TOKEN_RANGES: Record<PricingKey, { min: number; max: number }> = {
  privateSession: { min: 20, max: 150 },
  groupSession:   { min: 15, max: 80  },
  lecture:        { min: 10, max: 50  },
  workshop:       { min: 15, max: 200 },
};

const ManageProfileForm: FC = () => {
  const navigate = useNavigate();
  const { backendUrl } = useShopContext();
  const ageGroupRef = useRef<HTMLDivElement>(null);

  const {
    role,
    updatedData,
    setUpdatedData,
    availableProfiles,
    searchResults,
    isUploading,

    handleInputChange,
    handleLanguageSelect,
    handleSearch,
    handleAddRecommendation,
    handleRemoveRecommendation,
    handlePricingChange,
    handleFileChange,
    handleDeleteImage,
    handleDeleteVideo,
    handleToggleNotifications,
    handlePaymentMethodChange,   // still used when KES (mpesa only)
    handlePaymentDetailsChange,
    handleAgeGroupSelect,
    handleTeachingStyleSelect,
    handleExpertiseSelect,

    // NEW payout handlers from hook
    handlePayoutCurrencyChange,
    handlePayoutMethodChange,

    handleSubmit,
  } = useManageProfileForm(navigate);

  // Default tutors to USD payouts (Stripe/PayPal) if unset
  useEffect(() => {
    if (role === 'tutor') {
      setUpdatedData(prev => {
        const next = { ...prev };
        if (next.payoutCurrency !== 'USD' && next.payoutCurrency !== 'KES') {
          next.payoutCurrency = 'USD';
        }
        if (next.payoutCurrency === 'USD' && next.payoutMethod !== 'stripe' && next.payoutMethod !== 'paypal') {
          next.payoutMethod = 'stripe';
        }
        return next;
      });
    }
  }, [role, setUpdatedData]);

  const getFullUrl = (path: string) =>
    path?.startsWith('/') ? `${backendUrl}${path}` : path;

  const inputBase =
    'w-full p-3 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821] text-[#0d141c] dark:text-darkTextPrimary';

  const chipOn  = 'bg-pink-500 text-white border-pink-500';
  const chipOff = 'bg-[#e7edf4] text-[#49739c] dark:bg-[#172534] dark:text-darkTextSecondary border-transparent';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-darkBg py-10 sm:py-16 px-3 sm:px-4">
    <form
      onSubmit={e => {
        if (role === 'tutor' && updatedData.ageGroup.length === 0) {
          ageGroupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        handleSubmit(e);
      }}
      className="space-y-6 px-4 sm:px-6 pt-10 pb-16 sm:pt-12 sm:pb-20
                 rounded-2xl border border-[#cedbe8] dark:border-darkCard
                 bg-white dark:bg-[#0f1821] shadow-sm max-w-2xl mx-auto
                 text-[#0d141c] dark:text-darkTextPrimary"
    >
      {/* Role */}
      <p className="text-[#49739c] dark:text-darkTextSecondary">Role: {role || 'Loading…'}</p>

      {/* Name */}
      <input
        name="name"
        type="text"
        placeholder="Name"
        value={updatedData.name}
        onChange={e => handleInputChange('name', e)}
        className={inputBase}
        required
      />

      {/* Age */}
      <input
        name="age"
        type="number"
        placeholder="Age"
        min={role === 'tutor' ? 18 : 5}
        value={updatedData.age?.toString() || ''}
        onChange={e => handleInputChange('age', e)}
        className={inputBase}
        required
      />

      {/* Languages */}
      <div>
        <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Languages</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguageSelect(lang)}
              className={`px-3 py-1 rounded-full border text-sm ${updatedData.languages[lang] ? chipOn : chipOff}`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Student: Age Groups */}
      {role === 'student' && (
        <div ref={ageGroupRef}>
          <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Age Groups</label>
          <div className="flex flex-wrap gap-2">
            {AGE_GROUPS.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => handleAgeGroupSelect(g)}
                className={`px-3 py-1 rounded-full border text-sm ${updatedData.ageGroup.includes(g) ? chipOn : chipOff}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tutor Section */}
      {role === 'tutor' && (
        <>
          {/* Category */}
          <div>
            <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Category</label>
            <select
              name="category"
              value={updatedData.category}
              onChange={e => handleInputChange('category', e)}
              className={inputBase}
              required
            >
              <option value="" disabled>Select Category</option>
              {CATEGORY_OPTIONS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <select
            name="status"
            value={updatedData.status}
            onChange={e => handleInputChange('status', e)}
            className={inputBase}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Notifications */}
          <div className="flex items-center">
            <label className="text-[#49739c] dark:text-darkTextSecondary mr-2">Notifications</label>
            <input
              type="checkbox"
              checked={!!updatedData.notifications}
              onChange={() => handleToggleNotifications()}
              className="w-5 h-5 accent-pink-500"
            />
          </div>

          {/* Bio */}
          <textarea
            name="bio"
            rows={3}
            placeholder="Write a brief introduction…"
            value={updatedData.bio}
            onChange={e => handleInputChange('bio', e)}
            className={`${inputBase} !min-h-[96px]`}
          />

          {/* Pricing */}
          <div>
            <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">
              Rates (1 token = $1 USD)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PRICING_KEYS.map((field) => {
                const { min, max } = TOKEN_RANGES[field];
                return (
                  <div key={field}>
                    <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block">
                      {field.replace(/([A-Z])/g,' $1')} (Min {min} | Max {max})
                    </label>
                    <input
                      type="number"
                      min={min}
                      max={max}
                      value={(updatedData.pricing[field] ?? '').toString()}
                      onChange={e => handlePricingChange(field, e)}
                      className={`${inputBase} !p-2`}
                      required
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expertise */}
          <div>
            <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Expertise</label>
            <div className="flex flex-wrap gap-2">
              {['Exam Prep','Skill Building','Homework Help','Career Guidance'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleExpertiseSelect(opt)}
                  className={`px-3 py-1 rounded-full border text-sm ${updatedData.expertise.includes(opt) ? chipOn : chipOff}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Teaching Styles */}
          <div>
            <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Teaching Styles</label>
            <div className="flex flex-wrap gap-2">
              {['One-on-One','Group','Workshop','Lecture'].map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => handleTeachingStyleSelect(style)}
                  className={`px-3 py-1 rounded-full border text-sm ${updatedData.teachingStyle.includes(style) ? chipOn : chipOff}`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Experience Level</label>
            <div className="flex flex-wrap gap-2">
              {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleInputChange('experienceLevel', lvl)}
                  className={`px-3 py-1 rounded-full border text-sm ${updatedData.experienceLevel === lvl ? chipOn : chipOff}`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Age Groups You Teach */}
          <div ref={ageGroupRef}>
            <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Age Groups You Teach</label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleAgeGroupSelect(g)}
                  className={`px-3 py-1 rounded-full border text-sm ${updatedData.ageGroup.includes(g) ? chipOn : chipOff}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* ─────────────── Payout Preferences (NEW) ─────────────── */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-base sm:text-lg font-semibold text-[#49739c] dark:text-darkTextSecondary">
              Payout Preferences
            </h3>

            {/* Currency */}
            <div>
              <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                Payout Currency
              </label>
              <select
                name="payoutCurrency"
                value={updatedData.payoutCurrency}
                onChange={(e) => {
                  // call hook helper (sets payoutCurrency + payoutMethod)
                  handlePayoutCurrencyChange(e);
                  const val = (e.target.value as 'USD' | 'KES');
                  // also keep legacy paymentMethod in sync when switching to KES
                  if (val === 'KES') {
                    setUpdatedData(prev => ({ ...prev, paymentMethod: 'mpesa' }));
                  }
                }}
                className={inputBase}
                required
              >
                {/* Default is USD (Stripe/PayPal) */}
                <option value="USD">USD (Stripe or PayPal)</option>
                <option value="KES">KES (via M-Pesa)</option>
              </select>
            </div>

            {/* Method */}
            <div>
              <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                Payout Method
              </label>
              {updatedData.payoutCurrency === 'KES' ? (
                <input className={inputBase} value="mpesa" disabled readOnly />
              ) : (
                <select
                  name="payoutMethod"
                  value={updatedData.payoutMethod}
                  onChange={handlePayoutMethodChange}
                  className={inputBase}
                  required
                >
                  <option value="stripe">Stripe Connect</option>
                  <option value="paypal">PayPal</option>
                </select>
              )}
            </div>

            {/* Method details */}
            {updatedData.payoutCurrency === 'USD' && updatedData.payoutMethod === 'stripe' && (
              <div>
                <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                  Stripe Connect Account ID
                </label>
                <input
                  type="text"
                  placeholder="acct_1234..."
                  value={updatedData.stripeConnectId}
                  onChange={e => setUpdatedData(prev => ({ ...prev, stripeConnectId: e.target.value }))}
                  className={inputBase}
                  required
                />
              </div>
            )}

            {updatedData.payoutCurrency === 'USD' && updatedData.payoutMethod === 'paypal' && (
              <div>
                <label className="text-sm text-[#49739c] dark:text-darkTextSecondary block mb-1">
                  PayPal Email
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={updatedData.paypalEmail}
                  onChange={e => setUpdatedData(prev => ({ ...prev, paypalEmail: e.target.value }))}
                  className={inputBase}
                  required
                />
              </div>
            )}

            {updatedData.payoutCurrency === 'KES' && (
              <>
                {/* Show legacy Payment Method ONLY when KES (mpesa only) */}
                <div>
                  <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Payment Method</label>
                  <select
                    name="paymentMethod"
                    value={updatedData.paymentMethod}
                    onChange={e => handlePaymentMethodChange(e)}
                    className={inputBase}
                  >
                    <option value="mpesa">M-Pesa</option>
                  </select>
                </div>

                {/* M-Pesa details */}
                <input
                  name="mpesaPhoneNumber"
                  placeholder="+2547XXXXXXXXX"
                  value={updatedData.mpesaPhoneNumber}
                  onChange={e => handlePaymentDetailsChange('mpesaPhoneNumber', e)}
                  className={`${inputBase} mb-2`}
                  required
                />
              </>
            )}
          </div>

          {/* Gallery */}
          <div className="gallery-section mb-4">
            <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Upload Profile Image</label>
            <div className="w-40 h-40 border border-[#cedbe8] dark:border-darkCard rounded-lg overflow-hidden relative group bg-slate-50 dark:bg-[#0f1821]">
              <img
                src={
                  updatedData.gallery[0] instanceof File
                    ? URL.createObjectURL(updatedData.gallery[0] as File)
                    : updatedData.gallery[0]
                    ? getFullUrl(updatedData.gallery[0] as string)
                    : '/upload_placeholder.png'
                }
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                {updatedData.gallery[0] && (
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(0)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    title="Delete Image"
                  >
                    &times;
                  </button>
                )}
                {/* Upload / Replace */}
                <label className="p-2 bg-[#3d99f5] text-white rounded cursor-pointer">
                  {updatedData.gallery[0] ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const dataUrl = reader.result as string;
                        setUpdatedData(prev => {
                          const g = [...prev.gallery];
                          g[0] = dataUrl;
                          return { ...prev, gallery: g };
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Video */}
          <div className="video-section mb-4">
            <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Uploaded Video</label>
            <div className="relative rounded-lg overflow-hidden">
              {updatedData.video instanceof File ? (
                <video
                  src={URL.createObjectURL(updatedData.video as File)}
                  controls
                  className="w-full h-40 object-cover rounded-lg"
                />
              ) : updatedData.video ? (
                <video
                  src={getFullUrl(updatedData.video as string)}
                  controls
                  className="w-full h-40 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-40 bg-[#e7edf4] dark:bg-[#172534] flex items-center justify-center text-[#49739c] dark:text-darkTextSecondary rounded-lg">
                  No video uploaded
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                {updatedData.video && (
                  <button
                    type="button"
                    onClick={handleDeleteVideo}
                    className="p-2 bg-red-600 text-white rounded-full mr-2"
                  >
                    &times;
                  </button>
                )}
                <label className="p-2 bg-[#3d99f5] text-white rounded cursor-pointer">
                  {updatedData.video ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    accept="video/*"
                    hidden
                    onChange={e => handleFileChange(e, 0, 'video')}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="recommendations-section mb-4">
            <label className="text-[#49739c] dark:text-darkTextSecondary mb-2 block">Recommendations</label>
            <input
              type="text"
              placeholder="Search profiles…"
              onChange={e => handleSearch(e)}
              className={`${inputBase} !p-2 mb-2`}
            />
            {searchResults.length > 0 && (
              <div className="bg-slate-50 dark:bg-[#0f1821] p-2 rounded mb-2 max-h-40 overflow-y-auto border border-[#cedbe8] dark:border-darkCard">
                {searchResults.map(p => (
                  <div key={p._id} className="flex justify-between items-center p-2 even:bg-[#f6f9fc] dark:even:bg-[#101a27] rounded">
                    <span className="">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => handleAddRecommendation(p._id)}
                      className="bg-pink-500 px-3 py-1 rounded text-white"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              {updatedData.recommended.length > 0 ? (
                updatedData.recommended.map(id => {
                  const prof = availableProfiles.find(x => x._id === id);
                  return prof ? (
                    <div
                      key={id}
                      className="flex justify-between items-center p-2 bg-slate-50 dark:bg-[#0f1821] border border-[#cedbe8] dark:border-darkCard rounded hover:bg-[#f6f9fc] dark:hover:bg-[#101a27] transition-colors"
                    >
                      <span className="flex-1 truncate">{prof.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecommendation(id)}
                        className="text-[#49739c] hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null;
                })
              ) : (
                <p className="text-[#49739c] dark:text-darkTextSecondary">No recommendations yet.</p>
              )}
            </div>
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={isUploading}
        className="w-full bg-[#3d99f5] hover:brightness-110 text-white py-3 rounded-lg transition-all duration-300 disabled:opacity-60"
      >
        {isUploading ? 'Updating Profile…' : 'Update Profile'}
      </button>
    </form>
    </div>
  );
};

export default ManageProfileForm;
