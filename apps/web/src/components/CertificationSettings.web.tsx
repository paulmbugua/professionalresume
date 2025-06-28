import React from 'react';
import { useShopContext } from '@mytutorapp/shared/context'; // Use the custom hook instead of ShopContext
import Spinner from './Spinner.web';
import { useCertificationSettings } from '@mytutorapp/shared/hooks'; // Fixed typo

const CertificationSettings: React.FC = () => {
  // Use the custom hook to get the shop context values.
  const { token, backendUrl, profile } = useShopContext();

  // Only tutors can upload certification documents
  if (!profile || !profile.role || profile.role.toLowerCase() !== 'tutor') {
    return (
      <div className="w-full max-w-3xl mx-auto bg-gray-900 p-6 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-pink-400 mb-4">Tutor Certification</h2>
        <p className="text-gray-400 text-sm">Certification upload is available only for tutors.</p>
      </div>
    );
  }

  // Use the shared hook—pass in backendUrl, token, and profile.id
  const { uploading, certificationData, handleFileChange, handleSubmit } = useCertificationSettings(
    backendUrl,
    token,
    profile.id
  );

  if (uploading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto bg-gray-900 p-6 rounded-lg shadow-md">
      <h2 className="text-3xl font-bold text-pink-400 mb-4">Tutor Certification</h2>
      <p className="text-gray-400 mb-6 text-sm">
        (Optional) Enhance your profile's credibility by submitting your qualification documents.
        You can upload multiple files (each max 5MB, PDF/JPEG/PNG). You may submit these anytime
        after profile creation.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="certificationFiles" className="block text-gray-300 mb-2">
            Certification Documents
          </label>
          <input
            type="file"
            name="certification"
            id="certificationFiles"
            multiple
            accept=".pdf,image/*"
            onChange={handleFileChange}
            className="w-full p-2 rounded-md bg-gray-800 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <p className="text-gray-500 text-xs mt-1">
            Allowed formats: PDF, JPEG, PNG. Maximum file size per file: 5MB.
          </p>
        </div>
        {!certificationData || certificationData.status === 'Pending' ? (
          <button
            type="submit"
            disabled={uploading}
            className="w-full py-2 px-4 bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-md shadow transition duration-300"
          >
            {uploading
              ? 'Uploading...'
              : certificationData
                ? 'Update Certification'
                : 'Submit Certification'}
          </button>
        ) : (
          <div className="mt-6 p-4 bg-green-600 rounded-md">
            <p className="text-white text-sm">
              Certification status: <span className="font-bold">{certificationData.status}</span>
            </p>
          </div>
        )}
      </form>
    </div>
  );
};

export default CertificationSettings;
