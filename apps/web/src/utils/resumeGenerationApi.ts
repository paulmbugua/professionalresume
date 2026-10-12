import axios from 'axios';
import type { CvDraft } from '@cvpro/shared/types';
export type ResumeClaimReview = {
  path: string;
  statement: string;
  classification: 'SUPPORTED' | 'REASONABLE_REPHRASE' | 'UNSUPPORTED';
  evidence: string;
};
export type ResumeFactReview = {
  sourceReadable: boolean;
  warnings: string[];
  claims: ResumeClaimReview[];
};
export type ResumeBuildResult = {
  draft: CvDraft;
  factReview: ResumeFactReview;
  generatedResumeVersionId: string;
};
export type ResumeVersion = {
  id: string;
  resumeData: Partial<CvDraft>;
  factReview: ResumeFactReview;
  createdAt: string;
  action: string;
  originalDocumentId: string;
  targetJobDescription: string;
  filename?: string;
};
export const resumeClient = (backendUrl: string, token: string) =>
  axios.create({
    baseURL: backendUrl,
    withCredentials: true,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 420000,
  });
export async function uploadOriginalResume(backendUrl: string, token: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  return (
    await resumeClient(backendUrl, token).post<{
      originalDocumentId: string;
      filename: string;
      warnings: string[];
    }>('/api/cv/original-resumes', body)
  ).data;
}
export async function buildResume(
  backendUrl: string,
  token: string,
  payload: Record<string, unknown>
) {
  return (
    await resumeClient(backendUrl, token).post<ResumeBuildResult>('/api/cv/generate', payload)
  ).data;
}
export function resumeDataFromDraft(draft: CvDraft) {
  return {
    basics: {
      name: draft.basics.name,
      headline: draft.basics.headline,
      email: draft.basics.email,
      phone: draft.basics.phone,
      location: draft.basics.location,
      links: draft.basics.links,
    },
    targetTitle: draft.basics.headline || draft.targetTitle || '',
    summary: draft.summary || '',
    skills: draft.skills,
    experience: draft.experience.map((entry) => ({
      ...entry,
      location: entry.location || '',
      description: entry.description || '',
    })),
    education: draft.education.map((entry) => ({ ...entry, details: entry.details || '' })),
    projects: draft.projects.map((entry) => ({ ...entry, link: entry.link || '' })),
    certifications: draft.certifications.map((entry) => ({
      ...entry,
      issuer: entry.issuer || '',
      year: entry.year || '',
    })),
    extras: { languages: draft.extras.languages || [], interests: draft.extras.interests || [] },
    additionalSections: draft.additionalSections || [],
    sectionLabels: Object.fromEntries(
      ['summary', 'skills', 'experience', 'education', 'projects', 'certifications', 'extras'].map(
        (key) => [key, draft.sectionLabels?.[key as keyof typeof draft.sectionLabels] || key]
      )
    ),
  };
}
