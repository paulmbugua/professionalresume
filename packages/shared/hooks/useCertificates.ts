import { useCallback, useEffect, useRef, useState } from 'react';
import type { Certificate } from '@mytutorapp/shared/types';
import { getEligibility, generateCertificate, getMyCertificates } from '@mytutorapp/shared/api';

export function useCertificate(opts: { backendUrl: string; token: string; courseId: string }) {
  const { backendUrl, token, courseId } = opts;
  const [eligible, setEligible] = useState<boolean>(false);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const check = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const e = await getEligibility(backendUrl, token, courseId);
      if (!mounted.current) return;
      setEligible(!!e.eligible);
      setEligibilityReason(e.reason || null);

      const mine = await getMyCertificates(backendUrl, token);
      if (!mounted.current) return;
      const found = (mine || []).find(
        (c: any) => String(c.course_id) === String(courseId)
      ) || null;
      setCertificate(found);
    } catch (e: any) {
      if (!mounted.current) return;
      setErr(e?.response?.data?.error || e?.message || 'Failed to check certificate status');
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [backendUrl, token, courseId]);

  const generate = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const c = await generateCertificate(backendUrl, token, courseId);
      if (!mounted.current) return null;
      setCertificate(c);
      setEligible(true);
      return c;
    } catch (e: any) {
      if (mounted.current) {
        setErr(e?.response?.data?.error || e?.message || 'Failed to generate certificate');
      }
      throw e;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [backendUrl, token, courseId]);

  useEffect(() => { check(); }, [check]);

  return { eligible, eligibilityReason, certificate, loading, error: err, refetch: check, generate };
}
