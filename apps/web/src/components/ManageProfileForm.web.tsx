// /apps/web/src/components/ManageProfileForm.web.tsx

import React, { FC, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import useManageProfileForm from '@mytutorapp/shared/hooks/useManageProfileForm';

const STATUS_OPTIONS = [
  { value: 'Online',    label: 'Online' },
  { value: 'Offline',   label: 'Offline' },
  { value: 'Busy',      label: 'Busy' },
  { value: 'Free',      label: 'Free Session' },
  { value: 'New',       label: 'New' },
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

const ManageProfileForm: FC = () => {
  const navigate = useNavigate();
  const { backendUrl } = useShopContext();
  const ageGroupRef = useRef<HTMLDivElement>(null);

  const {
    role,
    updatedData,
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
    handlePaymentMethodChange,
    handlePaymentDetailsChange,
    handleAgeGroupSelect,
    handleTeachingStyleSelect,
    handleExpertiseSelect,
    handleSubmit,
  } = useManageProfileForm(navigate);

  const tokenRanges = {
  privateSession: { min: 20, max: 150 },
  groupSession:   { min: 15, max: 80  },
  lecture:        { min: 10, max: 50  },
  workshop:       { min: 15, max: 200 },
} as const;

  const getFullUrl = (path: string) =>
    path.startsWith('/') ? `${backendUrl}${path}` : path;

  return (
    <form
      onSubmit={e => {
        if (role === 'tutor' && updatedData.ageGroup.length === 0) {
          ageGroupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        handleSubmit(e);
      }}
      className="space-y-6 p-4 bg-gray-900 rounded-lg shadow-lg max-w-lg mx-auto pb-20"
    >
      {/* Role */}
      <p className="text-gray-400">Role: {role || 'Loading…'}</p>

      {/* Name */}
      <input
        name="name"
        type="text"
        placeholder="Name"
        value={updatedData.name}
        onChange={e => handleInputChange('name', e)}
        className="w-full p-3 rounded bg-gray-800 text-white"
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
        className="w-full p-3 rounded bg-gray-800 text-white"
        required
      />

      {/* Languages */}
      <div>
        <label className="text-gray-400 mb-2 block">Languages</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguageSelect(lang)}
              className={`px-3 py-1 rounded-full border text-sm ${
                updatedData.languages[lang]
                  ? 'bg-pink-500 text-white'
                  : 'bg-gray-800 text-gray-400'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Student: Age Groups */}
      {role === 'student' && (
        <div ref={ageGroupRef}>
          <label className="text-gray-400 mb-2 block">Age Groups</label>
          <div className="flex flex-wrap gap-2">
            {AGE_GROUPS.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => handleAgeGroupSelect(g)}
                className={`px-3 py-1 rounded-full border text-sm ${
                  updatedData.ageGroup.includes(g)
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-800 text-gray-400'
                }`}
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
            <label className="text-gray-400 mb-2 block">Category</label>
            <select
              name="category"
              value={updatedData.category}
              onChange={e => handleInputChange('category', e)}
              className="w-full p-3 rounded bg-gray-800 text-white"
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
          className="w-full p-3 rounded bg-gray-800 text-white"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

          {/* Notifications */}
          <div className="flex items-center">
            <label className="text-gray-400 mr-2">Notifications</label>
            <input
              type="checkbox"
              checked={!!updatedData.notifications}
              onChange={() => handleToggleNotifications()}
              className="w-5 h-5 text-pink-500"
            />
          </div>

          {/* Bio */}
          <textarea
            name="bio"
            rows={3}
            placeholder="Write a brief introduction…"
            value={updatedData.bio}
            onChange={e => handleInputChange('bio', e)}
            className="w-full p-3 rounded bg-gray-800 text-white"
          />

          {/* Pricing */}
          <div>
            <label className="text-gray-400 mb-2 block">
              Rates (Tokens per Session @10Shs/Token)
            </label>
            <div className="grid grid-cols-2 gap-4">
              {(
                Object.entries(tokenRanges) as [string,{min:number;max:number;}][]
              ).map(([field,{min,max}]) => (
                <div key={field}>
                  <label className="text-sm text-gray-300 block">
                    {field.replace(/([A-Z])/g,' $1')} (Min {min} | Max {max})
                  </label>
                  <input
                    type="number"
                    min={min}
                    max={max}
                    value={(updatedData.pricing[field as keyof typeof updatedData.pricing] ?? '').toString()}
                    onChange={e => handlePricingChange(field, e)}
                    className="w-full p-2 rounded bg-gray-800 text-white"
                    required
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Expertise */}
          <div>
            <label className="text-gray-400 mb-2 block">Expertise</label>
            <div className="flex flex-wrap gap-2">
              {['Exam Prep','Skill Building','Homework Help','Career Guidance'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleExpertiseSelect(opt)}
                  className={`px-3 py-1 rounded-full border text-sm ${
                    updatedData.expertise.includes(opt)
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Teaching Styles */}
          <div>
            <label className="text-gray-400 mb-2 block">Teaching Styles</label>
            <div className="flex flex-wrap gap-2">
              {['One-on-One','Group','Workshop','Lecture'].map(style => (
                <button
                  key={style}
                  type="button"
                  onClick={() => handleTeachingStyleSelect(style)}
                  className={`px-3 py-1 rounded-full border text-sm ${
                    updatedData.teachingStyle.includes(style)
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Experience Level */}
<div>
  <label className="text-gray-400 mb-2 block">Experience Level</label>
  <div className="flex flex-wrap gap-2">
    {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((lvl) => (
      <button
        key={lvl}
        type="button"
        onClick={() => handleInputChange('experienceLevel', lvl)}
        className={`px-3 py-1 rounded-full border text-sm ${
          updatedData.experienceLevel === lvl
            ? 'bg-pink-500 text-white'
            : 'bg-gray-800 text-gray-400'
        }`}
      >
        {lvl}
      </button>
    ))}
  </div>
</div>


          {/* Age Groups You Teach */}
          <div ref={ageGroupRef}>
            <label className="text-gray-400 mb-2 block">Age Groups You Teach</label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => handleAgeGroupSelect(g)}
                  className={`px-3 py-1 rounded-full border text-sm ${
                    updatedData.ageGroup.includes(g)
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-gray-400 mb-2 block">Payment Method</label>
            <select
              name="paymentMethod"
              value={updatedData.paymentMethod}
              onChange={e => handlePaymentMethodChange(e)}
              className="w-full p-3 rounded bg-gray-800 text-white"
            >
              <option value="" disabled>Select Payment Method</option>
              <option value="bank">Bank</option>
              <option value="mpesa">M-Pesa</option>
            </select>
          </div>

          {/* Bank / M-Pesa details */}
          {updatedData.paymentMethod === 'bank' && (
            <>
              <input
                name="bankAccount"
                placeholder="Bank Account Number"
                value={updatedData.bankAccount}
                onChange={e => handlePaymentDetailsChange('bankAccount', e)}
                className="w-full p-3 rounded bg-gray-800 text-white mb-2"
                required
              />
              <input
                name="bankCode"
                placeholder="Bank Code"
                value={updatedData.bankCode}
                onChange={e => handlePaymentDetailsChange('bankCode', e)}
                className="w-full p-3 rounded bg-gray-800 text-white mb-2"
                required
              />
            </>
          )}
          {updatedData.paymentMethod === 'mpesa' && (
            <input
              name="mpesaPhoneNumber"
              placeholder="+2547XXXXXXXXX"
              value={updatedData.mpesaPhoneNumber}
              onChange={e => handlePaymentDetailsChange('mpesaPhoneNumber', e)}
              className="w-full p-3 rounded bg-gray-800 text-white mb-2"
              required
            />
          )}

          {/* Gallery */}
          <div className="gallery-section mb-4">
            <label className="text-gray-400 mb-2 block">Upload Profile Image</label>
            <div className="w-40 h-40 border rounded-lg overflow-hidden relative group">
              <img
                src={
                  updatedData.gallery[0] instanceof File
                    ? URL.createObjectURL(updatedData.gallery[0])
                    : updatedData.gallery[0]
                    ? getFullUrl(updatedData.gallery[0] as string)
                    : '/upload_placeholder.png'
                }
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
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
                <label className="p-2 bg-blue-500 text-white rounded cursor-pointer">
                  {updatedData.gallery[0] ? 'Replace' : 'Upload'}
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={e => handleFileChange(e, 0, 'image')}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Video */}
          <div className="video-section mb-4">
            <label className="text-gray-400 mb-2 block">Uploaded Video</label>
            <div className="relative rounded-lg overflow-hidden">
              {updatedData.video instanceof File ? (
                <video
                  src={URL.createObjectURL(updatedData.video)}
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
                <div className="w-full h-40 bg-gray-800 flex items-center justify-center text-gray-500 rounded-lg">
                  No video uploaded
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                {updatedData.video && (
                  <button
                    type="button"
                    onClick={handleDeleteVideo}
                    className="p-2 bg-red-600 text-white rounded-full mr-2"
                  >
                    &times;
                  </button>
                )}
                <label className="p-2 bg-blue-500 text-white rounded cursor-pointer">
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
            <label className="text-gray-400 mb-2 block">Recommendations</label>
            <input
              type="text"
              placeholder="Search profiles…"
              onChange={e => handleSearch(e)}
              className="w-full p-2 rounded bg-gray-800 text-white mb-2"
            />
            {searchResults.length > 0 && (
              <div className="bg-gray-800 p-2 rounded mb-2 max-h-40 overflow-y-auto">
                {searchResults.map(p => (
                  <div key={p._id} className="flex justify-between items-center p-2 even:bg-gray-900 rounded">
                    <span className="text-white">{p.name}</span>
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
                      className="flex justify-between items-center p-2 bg-gray-900 rounded hover:bg-gray-800 transition-colors"
                    >
                      <span className="text-gray-100 flex-1 truncate">{prof.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecommendation(id)}
                        className="text-gray-500 hover:text-red-400"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null;
                })
              ) : (
                <p className="text-gray-500">No recommendations yet.</p>
              )}
            </div>
          </div>
        </>
      )}

      <button
        type="submit"
        disabled={isUploading}
        className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-lg transition-all duration-300"
      >
        {isUploading ? 'Updating Profile…' : 'Update Profile'}
      </button>
    </form>
  );
};

export default ManageProfileForm;
