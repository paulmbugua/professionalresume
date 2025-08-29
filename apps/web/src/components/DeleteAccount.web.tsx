// apps/web/src/components/DeleteAccount.web.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '@mytutorapp/shared/hooks';
import { FaTrashAlt, FaTimes } from 'react-icons/fa';

type Props = {
  /** Extra classes for the trigger button (size/spacing overrides). */
  triggerClassName?: string;
  /** Optional custom label for the trigger button. */
  label?: string;
};

const DeleteAccount: React.FC<Props> = ({ triggerClassName = '', label = 'Delete Account' }) => {
  const navigate = useNavigate();

  // ✅ Accept optional destination to satisfy the hook’s expected type
  const { handleDeleteAccount, isDeleting, deleteError } = useAuth({
    alertFn: (msg: string) => toast.info(msg),
    navigateFn: (destination?: string) => {
      // Fallback if destination is not provided
      navigate(destination ?? '/');
    },
  });

  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (deleteError) {
      toast.error(deleteError.message);
    }
  }, [deleteError]);

  // Base red style (always red); size can be overridden by triggerClassName
  const baseTrigger =
    'inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition';

  return (
    <>
      {/* NOTE: removed mt-8 to prevent vertical offset */}
      <button
        onClick={() => setModalOpen(true)}
        className={`${baseTrigger} ${triggerClassName}`}
      >
        <FaTrashAlt />
        {label}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-gray-800 text-white rounded-lg shadow-lg w-11/12 max-w-lg p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold">Delete Account?</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white transition"
                aria-label="Close delete dialog"
              >
                <FaTimes />
              </button>
            </div>

            {/* Explanation */}
            <div className="text-sm leading-relaxed space-y-3">
              <p>
                Deleting your account will permanently remove all your personal data and cannot be undone. Please review what will happen:
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
            <div className="flex justify-end gap-3">
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
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-60"
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
