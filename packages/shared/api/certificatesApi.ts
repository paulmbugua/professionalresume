import axios from 'axios';
import type { Certificate } from '@mytutorapp/shared/types';
import type { VerifyCertificateResponse, CertificateRecord } from '@mytutorapp/shared/types';

export async function verifyCertificatePublic(
  backendUrl: string,
  certificateId: string
): Promise<VerifyCertificateResponse> {
  const res = await axios.get<VerifyCertificateResponse>(
    `${backendUrl}/api/certificates/verify/${certificateId}`
  );
  return res.data;
}

export async function getEligibility(
  backendUrl: string,
  token: string,
  courseId: string
): Promise<{eligible: boolean; reason?: string|null}> {
  const res = await axios.get(`${backendUrl}/api/certificates/eligibility/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function listMyCertificates(backendUrl: string, token: string) {
  const { data } = await axios.get<CertificateRecord[]>(
    `${backendUrl}/api/certificates/me`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function generateCertificate(
  backendUrl: string,
  token: string,
  courseId: string
): Promise<Certificate> {
  const res = await axios.post(`${backendUrl}/api/certificates/generate`,
    { courseId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

export async function getMyCertificates(
  backendUrl: string,
  token: string
): Promise<Certificate[]> {
  const res = await axios.get(`${backendUrl}/api/certificates/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

export async function getCertificateById(
  backendUrl: string, token: string, id: string
): Promise<Certificate> {
  const res = await axios.get(`${backendUrl}/api/certificates/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}
