import axios from 'axios';

export type ImproveExperienceInput = {
  company?: string;
  role?: string;
  start?: string;
  end?: string;
  location?: string;
  description?: string;
  bullets?: string[];
  summary?: string;
};

export type ImproveExperienceResult = {
  description: string;
  bullets: string[];
};

const normalizeToken = (token?: string): string | undefined => {
  const next = String(token || '').trim();
  if (!next) return undefined;
  const lowered = next.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return undefined;
  return next;
};

export async function improveExperienceEntry(params: {
  backendUrl: string;
  token?: string;
  experience: ImproveExperienceInput;
  wholeCvContext?: {
    summary?: string;
    skills?: string[];
  };
}) {
  const { backendUrl, token, experience, wholeCvContext } = params;
  const safeToken = normalizeToken(token);

  const { data } = await axios.post(
    `${backendUrl}/api/cv/improve-experience`,
    {
      experience,
      wholeCvContext: wholeCvContext || {},
    },
    {
      headers: safeToken
        ? {
            Authorization: `Bearer ${safeToken}`,
          }
        : undefined,
    }
  );

  return data as {
    ok: boolean;
    improved: ImproveExperienceResult;
  };
}
