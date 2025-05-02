import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useManageProfileForm } from '@shared/hooks'; // ✅ shared hook
import type { UpdatedProfileData } from '@shared/types'; // for example

// Web-specific hook: wraps the shared business logic with React Router navigation.
const useManageProfileFormWrapper = () => {
  const navigate = useNavigate();
  return useManageProfileForm(navigate); // now it works if the import exists
};

const ManageProfileForm = () => {
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

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 bg-gray-900 rounded-lg shadow-lg max-w-lg mx-auto pb-20"
    >
      {/* Common Fields */}
      <input
        type="text"
        name="name"
        value={updatedData.name || ''}
        onChange={handleInputChange}
        placeholder="Name"
        className="w-full p-2 rounded bg-gray-800 text-white"
        required
      />
      <input
        type="number"
        name="age"
        value={updatedData.age || ''}
        onChange={handleInputChange}
        placeholder="Age"
        className="w-full p-2 rounded bg-gray-800 text-white"
        min="5"
        max="100"
      />

      {/* Languages Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-400 mb-2">Languages</h3>
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

      {/* Student-Specific Fields */}
      {role === 'student' && (
        <div>
          <h3 className="text-lg font-semibold text-gray-400 mb-2">Age Groups</h3>
          <div className="flex flex-wrap gap-3">
            {['Pre-Primary', 'Lower Primary', 'Upper Primary', 'University/College', 'Adults'].map(
              (group) => (
                <button
                  key={group}
                  type="button"
                  className={`p-2 rounded-lg border text-sm ${
                    updatedData.ageGroup.includes(group)
                      ? 'border-pink-500 text-gray-300'
                      : 'border-gray-700 text-gray-400'
                  }`}
                  onClick={() => handleAgeGroupSelect(group)}
                >
                  {group}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Tutor-Specific Fields */}
      {role === 'tutor' && (
        <>
          {/* Category and Status */}
          <h3 className="text-gray-400 font-semibold">Category</h3>
          <select
            name="category"
            value={updatedData.category || ''}
            onChange={handleInputChange}
            className="w-full p-2 rounded bg-gray-800 text-white"
          >
            <option value="" disabled>
              Select Category
            </option>
            <option value="Math Tutor">Math Tutor</option>
            <option value="Sciences">Sciences</option>
            <option value="Programming">Programming</option>
            <option value="Languages">Languages</option>
            <option value="Art & Design">Art & Design</option>
            <option value="Wellness">Wellness</option>
          </select>

          <select
            name="status"
            value={updatedData.status || 'Offline'}
            onChange={handleInputChange}
            className="w-full p-2 rounded bg-gray-800 text-white"
          >
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
            <option value="Busy">Busy</option>
            <option value="Free">Free Session</option>
          </select>

          {/* Notifications */}
          <div className="flex items-center">
            <label className="text-gray-400 mr-2">Notifications</label>
            <input
              type="checkbox"
              checked={!!updatedData.notifications}
              onChange={handleToggleNotifications}
              className="w-5 h-5 text-pink-500"
            />
          </div>

          {/* Bio Section */}
          <div className="space-y-2">
            <h3 className="text-gray-400 font-semibold">Bio</h3>
            <textarea
              name="bio"
              value={updatedData.bio || ''}
              onChange={handleInputChange}
              placeholder="Write a brief introduction about yourself..."
              className="w-full p-2 rounded bg-gray-800 text-white"
              rows={3}
            />
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-400">
              Set Your Rates (Tokens per Session @10Shs/Token)
            </h3>

            {/** Define token range object and type outside the .map */}
            {(() => {
              const tokenRanges = {
                privateSession: { min: 20, max: 150 },
                groupSession: { min: 15, max: 80 },
                lecture: { min: 10, max: 50 },
                workshop: { min: 15, max: 200 },
              };

              type TokenField = keyof typeof tokenRanges;

              return (
                <div className="grid grid-cols-2 gap-4">
                  {(Object.keys(tokenRanges) as TokenField[]).map((field) => (
                    <div key={field} className="flex flex-col">
                      <label className="text-sm font-medium text-gray-300">
                        {field.replace(/([A-Z])/g, ' $1')} (Min: {tokenRanges[field].min} | Max:{' '}
                        {tokenRanges[field].max})
                      </label>
                      <input
                        type="number"
                        placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1')} Tokens`}
                        value={updatedData.pricing[field]}
                        onChange={(e) => handlePricingChange(e, field)}
                        className="p-3 rounded-lg bg-gray-800 text-gray-300 focus:outline-none"
                        min={tokenRanges[field].min}
                        max={tokenRanges[field].max}
                      />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Expertise Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Expertise</h3>
            <div className="flex flex-wrap gap-3">
              {['Exam Prep', 'Skill Building', 'Homework Help', 'Career Guidance'].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`p-2 rounded-lg border text-sm ${
                    updatedData.expertise.includes(option)
                      ? 'border-pink-500 text-gray-300'
                      : 'border-gray-700 text-gray-400'
                  }`}
                  onClick={() =>
                    setUpdatedData((prev: UpdatedProfileData) => ({
                      ...prev,
                      expertise: prev.expertise.includes(option)
                        ? prev.expertise.filter((item: string) => item !== option)
                        : [...prev.expertise, option],
                    }))
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Teaching Style Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Teaching Styles</h3>
            <div className="flex flex-wrap gap-3">
              {['One-on-One', 'Group', 'Workshop', 'Lecture'].map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`p-2 rounded-lg border text-sm ${
                    updatedData.teachingStyle.includes(style)
                      ? 'border-pink-500 text-gray-300'
                      : 'border-gray-700 text-gray-400'
                  }`}
                  onClick={() => handleTeachingStyleSelect(style)}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Experience Level</h3>
            <select
              name="experienceLevel"
              value={updatedData.experienceLevel}
              onChange={handleInputChange}
              className="w-full p-2 rounded bg-gray-800 text-white"
            >
              <option value="" disabled>
                Select Experience Level
              </option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Expert">Expert</option>
            </select>
          </div>

          {/* Age Group Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Age Groups</h3>
            <div className="flex flex-wrap gap-3">
              {[
                'Pre-Primary',
                'Lower Primary',
                'Upper Primary',
                'University/College',
                'Adults',
              ].map((group) => (
                <button
                  key={group}
                  type="button"
                  className={`p-2 rounded-lg border text-sm ${
                    updatedData.ageGroup.includes(group)
                      ? 'border-pink-500 text-gray-300'
                      : 'border-gray-700 text-gray-400'
                  }`}
                  onClick={() => handleAgeGroupSelect(group)}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method Section */}
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-gray-400 mb-3">Payment Method</h3>
            <div className="flex flex-col space-y-2">
              <label htmlFor="paymentMethod" className="text-gray-300 text-sm font-medium">
                Choose Payment Method
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
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="bankAccount" className="text-gray-300 text-sm font-medium">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    name="bankAccount"
                    value={updatedData.bankAccount || ''}
                    onChange={handlePaymentDetailsChange}
                    placeholder="Enter Bank Account Number"
                    className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <label htmlFor="bankCode" className="text-gray-300 text-sm font-medium">
                    Bank Code
                  </label>
                  <input
                    type="text"
                    name="bankCode"
                    value={updatedData.bankCode || ''}
                    onChange={handlePaymentDetailsChange}
                    placeholder="Enter Bank Code"
                    className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
            {updatedData.paymentMethod === 'mpesa' && (
              <div className="space-y-4">
                <div className="flex flex-col space-y-2">
                  <label htmlFor="mpesaPhoneNumber" className="text-gray-300 text-sm font-medium">
                    M-Pesa Phone Number
                  </label>
                  <input
                    type="text"
                    name="mpesaPhoneNumber"
                    value={updatedData.mpesaPhoneNumber || ''}
                    onChange={handlePaymentDetailsChange}
                    placeholder="+2547XXXXXXXXX"
                    className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Gallery Section */}
          <div className="gallery-section">
            <h3 className="text-gray-400">Upload Profile Image</h3>
            <div className="w-40 h-40 border flex items-center justify-center relative group">
              <img
                src={
                  updatedData.gallery[0] instanceof File
                    ? URL.createObjectURL(updatedData.gallery[0])
                    : updatedData.gallery[0] || '/upload_placeholder.png'
                }
                alt="Gallery"
                className="w-full h-full object-cover rounded"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity">
                {updatedData.gallery[0] && (
                  <button
                    onClick={() => handleDeleteImage(0)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    title="Delete Image"
                  >
                    &times;
                  </button>
                )}
                <label className="p-2 bg-blue-500 text-white rounded cursor-pointer">
                  {updatedData.gallery[0] ? 'Replace' : 'Upload'}
                  <input type="file" hidden onChange={(e) => handleFileChange(e, 0, 'image')} />
                </label>
              </div>
            </div>
          </div>

          {/* Video Section */}
          <div className="video-section">
            <label className="text-gray-400">Uploaded Video</label>
            <div className="relative">
              {updatedData.video instanceof File ? (
                <video
                  src={URL.createObjectURL(updatedData.video)}
                  controls
                  className="w-full h-40 object-cover rounded"
                />
              ) : updatedData.video ? (
                <video
                  src={updatedData.video}
                  controls
                  className="w-full h-40 object-cover rounded"
                />
              ) : (
                <div className="w-full h-40 bg-gray-800 rounded flex items-center justify-center text-gray-500">
                  No video uploaded
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity">
                {updatedData.video && (
                  <button
                    onClick={() => handleDeleteVideo()}
                    className="p-2 bg-red-600 text-white rounded-full mr-2"
                  >
                    &times;
                  </button>
                )}
                <label className="p-2 bg-blue-500 text-white rounded cursor-pointer">
                  {updatedData.video ? 'Replace' : 'Upload'}
                  <input type="file" hidden onChange={(e) => handleFileChange(e, 0, 'video')} />
                </label>
              </div>
            </div>
          </div>

          {/* Recommendations Section */}
          <div className="recommendations-section">
            <h3 className="text-gray-400">Recommendations</h3>
            <input
              type="text"
              placeholder="Search profiles to recommend..."
              onChange={handleSearch}
              className="w-full p-2 rounded bg-gray-800 text-white mb-4"
            />
            {searchResults.length > 0 && (
              <div className="search-results bg-gray-800 p-4 rounded-lg mb-4">
                {searchResults.map((prof: { _id: string; name: string }) => (
                  <div key={prof._id} className="flex justify-between items-center p-2">
                    <span className="text-white">{prof.name}</span>
                    <button
                      onClick={() => {
                        if (!updatedData.recommended.includes(prof._id)) {
                          handleAddRecommendation(prof._id);
                          // Clear search results after adding recommendation
                          setUpdatedData((prev: UpdatedProfileData) => ({ ...prev }));
                        } else {
                          toast.info(`${prof.name} is already recommended.`);
                        }
                      }}
                      className="bg-pink-500 hover:bg-pink-600 text-white px-3 py-1 rounded-lg"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="selected-recommendations space-y-2">
              <h4 className="text-gray-300 text-sm font-semibold">Selected Recommendations</h4>
              {updatedData.recommended.length > 0 ? (
                updatedData.recommended.map((id: string) => {
                  const prof = availableProfiles.find(
                    (profile: { _id: string; name: string }) => profile._id === id
                  );

                  return (
                    prof && (
                      <div
                        key={id}
                        className="flex items-center justify-between bg-gray-900 p-2 rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <span className="text-sm text-gray-100 font-medium truncate">
                          {prof.name}
                        </span>
                        <button
                          onClick={() => handleRemoveRecommendation(id)}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                          aria-label={`Remove ${prof.name}`}
                        >
                          ✕
                        </button>
                      </div>
                    )
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">No recommendations selected.</p>
              )}
            </div>
          </div>
        </>
      )}

      <button
        type="submit"
        className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 px-4 rounded-lg transition-all duration-300 mt-8 mb-6"
        disabled={isUploading}
      >
        {isUploading ? 'Updating Profile...' : 'Update Profile'}
      </button>
    </form>
  );
};

export default ManageProfileForm;
