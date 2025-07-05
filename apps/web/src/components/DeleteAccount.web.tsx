// /apps/web/src/components/DeleteAccount.web.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { toast } from 'react-toastify';
import { useAuth } from '@mytutorapp/shared/hooks';

const DeleteAccount: React.FC = () => {
  const navigate = useNavigate();
  const {
    handleDeleteAccount,
    isDeleting,
    deleteError,
  } = useAuth({
    alertFn: (msg: string) => toast.info(msg),
    navigateFn: (destination: string) => navigate(destination),
  });

  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (deleteError) {
      toast.error(deleteError.message);
    }
  }, [deleteError]);

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-sm transition"
      >
        <FontAwesomeIcon icon={['fas', 'trash-alt'] as IconProp} />
        Delete My Account
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-gray-800 text-white rounded-lg shadow-lg w-11/12 max-w-lg p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold">Delete Account?</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <FontAwesomeIcon icon={['fas', 'times'] as IconProp} />
              </button>
            </div>

            {/* Explanation */}
            <div className="text-sm leading-relaxed space-y-3">
              <p>
                Deleting your account will permanently remove all your personal
                data and cannot be undone. Please review what will happen:
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong>Data Removal:</strong> Your profile, history, messages, and settings will be erased.
                </li>
                <li>
                  <strong>Purchases & Tokens:</strong> Any purchased content or tokens will be lost.
                </li>
                <li>
                  <strong>Irreversible:</strong> All data is permanently deleted.
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 transition"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleDeleteAccount();
                }}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 transition flex items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DeleteAccount;
