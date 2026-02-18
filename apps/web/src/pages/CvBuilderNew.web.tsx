import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCreateCvDraft } from '@mytutorapp/shared/hooks';

const CvBuilderNew: React.FC = () => {
  const [params] = useSearchParams();
  const templateId = params.get('templateId');
  const navigate = useNavigate();
  const { backendUrl, token } = useShopContext() as any;
  const createDraft = useCreateCvDraft({ backendUrl, token });

  useEffect(() => {
    if (!templateId) {
      navigate('/templates', { replace: true });
      return;
    }
    if (!token) {
      navigate('/login?returnTo=' + encodeURIComponent(`/builder/new?templateId=${templateId}`), { replace: true });
      return;
    }

    createDraft
      .mutateAsync({ templateId, title: 'Untitled CV' })
      .then((draft) => navigate(`/builder/${draft.id}`, { replace: true }))
      .catch(() => {
        navigate('/templates', { replace: true });
      });
  }, [templateId, token, navigate, createDraft]);

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-screen-lg items-center justify-center px-4 py-12 text-center">
      <div>
        <p className="text-sm text-gray-500">Preparing your CV workspace...</p>
      </div>
    </div>
  );
};

export default CvBuilderNew;
