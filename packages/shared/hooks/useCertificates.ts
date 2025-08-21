import { useCallback, useEffect, useState } from 'react';
import type { Certificate } from '@mytutorapp/shared/types';
import { getEligibility, generateCertificate, getMyCertificates } from '@mytutorapp/shared/api';

export function useCertificate(opts: { backendUrl: string; token: string; courseId: string }) {
  const { backendUrl, token, courseId } = opts;
  const [eligible, setEligible] = useState<boolean>(false);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const check = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const e = await getEligibility(backendUrl, token, courseId);
      setEligible(e.eligible);
      setEligibilityReason(e.reason || null);

      // fetch if already exists for this course
      const mine = await getMyCertificates(backendUrl, token);
      const found = mine.find((c) => c.course_id === courseId) || null;
      setCertificate(found);
    } catch (e: any) {
      setErr(e.message || 'Failed to check certificate status');
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token, courseId]);

  const generate = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const c = await generateCertificate(backendUrl, token, courseId);
      setCertificate(c);
      setEligible(true);
      return c;
    } catch (e: any) {
      setErr(e.response?.data?.error || e.message || 'Failed to generate certificate');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token, courseId]);

  useEffect(() => { check(); }, [check]);

  return { eligible, eligibilityReason, certificate, loading, error: err, refetch: check, generate };
}
