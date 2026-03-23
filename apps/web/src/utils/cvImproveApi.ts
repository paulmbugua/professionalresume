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

  const { data } = await axios.post(
    `${backendUrl}/api/cv/improve-experience`,
    {
      experience,
      wholeCvContext: wholeCvContext || {},
    },
    {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
    }
  );

  return data as {
    ok: boolean;
    improved: ImproveExperienceResult;
  };
}
