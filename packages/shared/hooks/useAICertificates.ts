import { useCallback, useEffect, useState } from 'react';
import type { AICertificateSKU, AICertificateIssuance, Certificate } from '@mytutorapp/shared/types';
import { listAICertificates, issueAICertificate, generateCertificatePdf } from '@mytutorapp/shared/api';

interface UseAICertsOptions {
  backendUrl: string;
  token: string;
  courseId?: string; // pass when a cert is tied to a course
}

export function useAICertificates({ backendUrl, token, courseId }: UseAICertsOptions) {
  const [skus, setSkus] = useState<AICertificateSKU[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const items = await listAICertificates(backendUrl, token);
      setSkus(items);
      return items;
    } catch (e: any) {
      setError(e?.message || 'Failed to load certificates');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token]);

  const claim = useCallback(async (code: string): Promise<AICertificateIssuance> => {
    setLoading(true); setError(null); setMessage(null);
    try {
      const out = await issueAICertificate(backendUrl, token, { code, courseId });
      setMessage(`Claimed ✔ – ${out.debitedTokens} tokens deducted`);
      return out;
    } catch (e: any) {
      setError(e?.message || 'Failed to claim certificate');
      throw e;
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token, courseId]);

  const generate = useCallback(async (): Promise<Certificate & { download_url?: string }> => {
    if (!courseId) throw new Error('courseId is required to generate');
    setLoading(true); setError(null); setMessage(null);
    try {
      const doc = await generateCertificatePdf(backendUrl, token, { courseId });
      setMessage('Certificate generated ✔');
      return doc;
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to generate certificate';
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [backendUrl, token, courseId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { skus, loading, error, message, refresh, claim, generate };
}
