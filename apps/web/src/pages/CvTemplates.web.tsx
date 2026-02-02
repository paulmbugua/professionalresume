import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCvTemplates } from '@mytutorapp/shared/hooks';
import TemplateGallery from '../components/cv/TemplateGallery';

const CvTemplatesPage: React.FC = () => {
  const { backendUrl } = useShopContext() as any;
  const processEnv = typeof process !== 'undefined' ? process.env : undefined;
  const importMetaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const envBackendUrl =
    processEnv?.NEXT_PUBLIC_BACKEND_URL?.trim() ||
    importMetaEnv?.VITE_BACKEND_URL?.trim() ||
    '';
  const resolvedBackendUrl = envBackendUrl || backendUrl?.trim() || 'http://localhost:4001';
  const { data: templates = [], isLoading, error } = useCvTemplates({
    backendUrl: resolvedBackendUrl,
  });
  const navigate = useNavigate();
  const isDev =
    (processEnv?.NODE_ENV === 'production' || importMetaEnv?.MODE === 'production') ? false : true;

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 pb-12 pt-8 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Template Gallery</p>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Choose a CV template
          </h2>
          <p className="text-sm text-gray-500 dark:text-white/60">
            ATS-friendly layouts with premium typography.
          </p>
          {isDev && (
            <p className="mt-2 text-xs text-gray-400">Backend: {resolvedBackendUrl}</p>
          )}
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading templates...</p>}
      {error && <p className="text-sm text-rose-500">{error.message}</p>}
      {!isLoading && !error && templates.length === 0 && (
        <p className="text-sm text-gray-500">
          No templates found. Add templates in the backend to get started.
        </p>
      )}

      {templates.length > 0 && (
        <TemplateGallery
          templates={templates}
          onSelect={(template) => navigate(`/builder/new?templateId=${template.id}`)}
        />
      )}
    </div>
  );
};

export default CvTemplatesPage;
