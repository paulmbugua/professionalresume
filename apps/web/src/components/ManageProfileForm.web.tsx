import React, {
  ChangeEvent,
  ChangeEventHandler,
  FC,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useManageProfileForm } from '@mytutorapp/shared/hooks';
import type { UpdatedProfileData } from '@mytutorapp/shared/types';

const useManageProfileFormWrapper = () => {
  const navigate = useNavigate();
  return useManageProfileForm(navigate);
};

const ManageProfileForm: FC = () => {
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
    handleSubmit,
    handleTeachingStyleSelect,
    setUpdatedData,
  } = useManageProfileFormWrapper();

  // ---- helpers ----

  // Strongly-typed wrappers for generic inputs
  const bindInput =
    (
      field: keyof UpdatedProfileData
    ): ChangeEventHandler<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    > =>
    (e) =>
      handleInputChange(field as string, e);

  // Payment-detail specific wrapper
  const bindPaymentDetails =
    (
      field: 'bankAccount' | 'bankCode' | 'mpesaPhoneNumber'
    ): ChangeEventHandler<HTMLInputElement> =>
    (e) =>
      handlePaymentDetailsChange(field, e);

  // Pricing ranges
  const tokenRanges = {
    privateSession: { min: 20, max: 150 },
    groupSession: { min: 15, max: 80 },
    lecture: { min: 10, max: 50 },
    workshop: { min: 15, max: 200 },
  } as const;
  type TokenField = keyof typeof tokenRanges;

  // ---- render ----

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 bg-gray-900 rounded-lg shadow-lg max-w-lg mx-auto pb-20"
    >
      {/* Name */}
      <input
        type="text"
        name="name"
        value={updatedData.name || ''}
        onChange={bindInput('name')}
        placeholder="Name"
        className="w-full p-2 rounded bg-gray-800 text-white"
        required
      />

      {/* Age */}
      <input
        type="number"
        name="age"
        value={updatedData.age || ''}
        onChange={bindInput('age')}
        placeholder="Age"
        className="w-full p-2 rounded bg-gray-800 text-white"
        min={5}
        max={100}
      />

      {/* Languages */}
      <div>
        <h3 className="text-lg font-semibold text-gray-400 mb-2">
          Languages
        </h3>
        <div className="flex flex-wrap gap-3">
          {Object.keys(updatedData.languages).map((language) => (
            <button
              key={language}
              type="button"
              className={`p-2 rounded-lg border text-sm ${
                updatedData.languages[language]
                  ? 'border-pink-500 text-gray-300'
                  : 'border-gray-700 text-gray-400'
              }`}
              onClick={() => handleLanguageSelect(language)}
            >
              {language}
            </button>
          ))}
        </div>
      </div>

      {/* Student-only */}
      {role === 'student' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">
            Age Groups
          </h3>
          <div className="flex flex-wrap gap-3">
            {[
              'Pre-Primary',
              'Lower Primary',
              'Upper Primary',
              'University/College',
              'Adults',
            ].map((g) => (
              <button
                key={g}
                type="button"
                className={`p-2 rounded-lg border text-sm ${
                  updatedData.ageGroup.includes(g)
                    ? 'border-pink-500 text-gray-300'
                    : 'border-gray-700 text-gray-400'
                }`}
                onClick={() => handleAgeGroupSelect(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tutor-only */}
      {role === 'tutor' && (
        <>
          {/* Category */}
          <select
            name="category"
            value={updatedData.category || ''}
            onChange={bindInput('category')}
            className="w-full p-2 rounded bg-gray-800 text-white"
          >
            <option value="" disabled>
              Select Category
            </option>
            {[
              'Math Tutor',
              'Sciences',
              'Programming',
              'Languages',
              'Art & Design',
              'Wellness',
            ].map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          {/* Status */}
          <select
            name="status"
            value={updatedData.status || 'Offline'}
            onChange={bindInput('status')}
            className="w-full p-2 rounded bg-gray-800 text-white"
          >
            {['Online', 'Offline', 'Busy', 'Free'].map((s) => (
              <option key={s} value={s}>
                {s === 'Free' ? 'Free Session' : s}
              </option>
            ))}
          </select>

          {/* Notifications */}
          <div className="flex items-center">
            <label className="text-gray-400 mr-2">
              Notifications
            </label>
            <input
              type="checkbox"
              checked={!!updatedData.notifications}
              onChange={handleToggleNotifications}
              className="w-5 h-5 text-pink-500"
            />
          </div>

          {/* Bio */}
          <textarea
            name="bio"
            value={updatedData.bio || ''}
            onChange={bindInput('bio')}
            placeholder="Write a brief introduction about yourself..."
            className="w-full p-2 rounded bg-gray-800 text-white"
            rows={3}
          />

          {/* Pricing */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-400">
              Set Your Rates (Tokens per Session @10Shs/Token)
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {(
  Object.entries(tokenRanges) as Array<
    [TokenField, typeof tokenRanges[TokenField]]
  >
).map(([field, { min, max }]) => (
  <div key={field} className="flex flex-col">
    <label className="text-sm font-medium text-gray-300">
      {field.replace(/([A-Z])/g, ' $1')} (Min: {min} | Max: {max})
    </label>
    <input
      type="number"
      placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1')} Tokens`}
      value={updatedData.pricing[field] || ''}
      onChange={(e: ChangeEvent<HTMLInputElement>) =>
        handlePricingChange(field, e)
      }
      className="p-3 rounded-lg bg-gray-800 text-gray-300 focus:outline-none"
      min={min}
      max={max}
    />
  </div>
))}

            </div>
          </div>

          {/* Expertise */}
          <div>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              Expertise
            </h3>
            <div className="flex flex-wrap gap-3">
              {[
                'Exam Prep',
                'Skill Building',
                'Homework Help',
                'Career Guidance',
              ].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`p-2 rounded-lg border text-sm ${
                    updatedData.expertise.includes(opt)
                      ? 'border-pink-500 text-gray-300'
                      : 'border-gray-700 text-gray-400'
                  }`}
                  onClick={() =>
                    setUpdatedData((prev) => ({
                      ...prev,
                      expertise: prev.expertise.includes(opt)
                        ? prev.expertise.filter((e) => e !== opt)
                        : [...prev.expertise, opt],
                    }))
                  }
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Teaching Styles */}
          <div>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">
              Teaching Styles
            </h3>
            <div className="flex flex-wrap gap-3">
              {['One-on-One', 'Group', 'Workshop', 'Lecture'].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`p-2 rounded-lg border text-sm ${
                    updatedData.teachingStyle.includes(s)
                      ? 'border-pink-500 text-gray-300'
                      : 'border-gray-700 text-gray-400'
                  }`}
                  onClick={() => handleTeachingStyleSelect(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <select
            name="experienceLevel"
            value={updatedData.experienceLevel || ''}
            onChange={bindInput('experienceLevel')}
            className="w-full p-2 rounded bg-gray-800 text-white"
          >
            <option value="" disabled>
              Select Experience Level
            </option>
            {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>

          {/* Payment Method */}
          <div className="space-y-2">
            <label className="text-gray-300 text-sm font-medium">
              Payment Method
            </label>
            <select
              name="paymentMethod"
              value={updatedData.paymentMethod || ''}
              onChange={handlePaymentMethodChange}
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Payment Method</option>
              <option value="bank">Bank</option>
              <option value="mpesa">M-Pesa</option>
            </select>
          </div>

          {updatedData.paymentMethod === 'bank' && (
            <>
              <input
                type="text"
                name="bankAccount"
                value={updatedData.bankAccount || ''}
                onChange={bindPaymentDetails('bankAccount')}
                placeholder="Bank Account Number"
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                name="bankCode"
                value={updatedData.bankCode || ''}
                onChange={bindPaymentDetails('bankCode')}
                placeholder="Bank Code"
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}

          {updatedData.paymentMethod === 'mpesa' && (
            <input
              type="text"
              name="mpesaPhoneNumber"
              value={updatedData.mpesaPhoneNumber || ''}
              onChange={bindPaymentDetails('mpesaPhoneNumber')}
              placeholder="+2547XXXXXXXXX"
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          {/* Gallery & Video & Recommendations omitted for brevity... */}
          {/* (Those sections remain unchanged from the previous version.) */}

          <button
            type="submit"
            className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 px-4 rounded-lg transition-all duration-300 mt-8 mb-6"
            disabled={isUploading}
          >
            {isUploading ? 'Updating Profile...' : 'Update Profile'}
          </button>
        </>
      )}
    </form>
  );
};

export default ManageProfileForm;
