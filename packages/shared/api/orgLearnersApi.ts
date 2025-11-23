// packages/shared/api/orgLearnersApi.ts
import axios from 'axios';

export type CreateOrgLearnerPayload = {
  name: string;
  email?: string;
  class_label?: string;
  guardian_email?: string;
};

export async function createOrgLearner(
  backendUrl: string,
  token: string,
  orgId: string,
  payload: CreateOrgLearnerPayload
) {
  const base = backendUrl.replace(/\/+$/, '');
  const res = await axios.post(
    `${base}/api/orgs/${orgId}/learners`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data as {
    ok: boolean;
    learner: {
      id: number;
      name: string;
      email?: string;
      class_label?: string | null;
      guardian_email?: string | null;
    };
    tempPassword?: string | null;
  };
}

export async function uploadOrgLearnersCsv(
  backendUrl: string,
  token: string,
  orgId: string,
  file: File
) {
  const base = backendUrl.replace(/\/+$/, '');
  const fd = new FormData();
  fd.append('file', file);

  const res = await axios.post(
    `${base}/api/orgs/${orgId}/learners/csv`,
    fd,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return res.data as {
    ok: boolean;
    createdCount: number;
    reusedCount: number;
  };
}
