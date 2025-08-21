import React from 'react';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCertificate } from '@mytutorapp/shared/hooks/useCertificates';

const CertificateButton: React.FC<{ courseId: string }> = ({ courseId }) => {
  const { backendUrl, token } = useShopContext();
  const { eligible, eligibilityReason, certificate, loading, error, generate } =
    useCertificate({ backendUrl, token, courseId });

  if (certificate) {
    return (
      <a
        href={certificate.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-xl h-10 px-4 bg-green-600 text-white font-semibold hover:bg-green-700"
      >
        Download Certificate
      </a>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className={`inline-flex items-center justify-center rounded-xl h-10 px-4 font-semibold ${
          eligible ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
        onClick={() => generate().catch(() => {})}
        disabled={!eligible || loading}
      >
        {loading ? 'Generating…' : 'Generate Certificate'}
      </button>
      {!eligible && eligibilityReason && (
        <p className="text-sm text-[#49739c]">{eligibilityReason}</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>

    {certificate && (
  <div className="flex gap-3">
    <a href={certificate.url} target="_blank" rel="noopener noreferrer" className="...">
      Download Certificate
    </a>
    <a href={`/verify/${certificate.id}`} className="inline-flex items-center justify-center rounded-xl h-10 px-4 bg-[#e7edf4] text-[#0d141c] font-semibold">
      Verify
    </a>
  </div>
)}

  );
};

export default CertificateButton;
