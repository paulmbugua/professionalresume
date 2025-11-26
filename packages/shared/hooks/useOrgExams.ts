import { useCallback, useState } from 'react';
import type {
  OrgExamConfig,
  OrgExamResultRow,
  OrgExamStudentCard,
  OrgExamAnalyticsRow,
} from '@mytutorapp/shared/types';
import {
  getOrgExamConfig,
  saveOrgExamConfig,
  getOrgExamSheet,
  saveOrgExamSheet,
  getOrgExamStudentCard,
  sendOrgExamStudentCardEmail,
  getOrgExamAnalytics,
} from '@mytutorapp/shared/api/orgExamsApi';

interface UseOrgExamsProps {
  backendUrl: string;
  token?: string | null;
  orgId?: string;
}

export function useOrgExams({ backendUrl, token, orgId }: UseOrgExamsProps) {
  const [config, setConfig] = useState<OrgExamConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [sheetRows, setSheetRows] = useState<OrgExamResultRow[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [savingSheet, setSavingSheet] = useState(false);
  const [analytics, setAnalytics] = useState<OrgExamAnalyticsRow[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const ensure = () => backendUrl && token && orgId;

  const fetchConfig = useCallback(async () => {
    if (!ensure()) return;
    setConfigLoading(true);
    try {
      const c = await getOrgExamConfig(backendUrl, token!, orgId!);
      setConfig(c);
    } finally {
      setConfigLoading(false);
    }
  }, [backendUrl, token, orgId]);

  const saveConfig = useCallback(
    async (next: OrgExamConfig) => {
      if (!ensure()) return;
      await saveOrgExamConfig(backendUrl, token!, orgId!, next);
      setConfig(next);
    },
    [backendUrl, token, orgId]
  );

  const fetchSheet = useCallback(
    async (sessionId: string, classLabel?: string) => {
      if (!ensure()) return;
      setSheetLoading(true);
      try {
        const rows = await getOrgExamSheet(backendUrl, token!, orgId!, sessionId, classLabel);
        setSheetRows(rows);
      } finally {
        setSheetLoading(false);
      }
    },
    [backendUrl, token, orgId]
  );

  const saveSheet = useCallback(
    async (sessionId: string, classLabel: string | undefined, rows: OrgExamResultRow[]) => {
      if (!ensure()) return;
      setSavingSheet(true);
      try {
        await saveOrgExamSheet(backendUrl, token!, orgId!, { sessionId, classLabel, rows });
        setSheetRows(rows);
      } finally {
        setSavingSheet(false);
      }
    },
    [backendUrl, token, orgId]
  );

  const fetchStudentCard = useCallback(
    async (sessionId: string, studentId: number): Promise<OrgExamStudentCard | null> => {
      if (!ensure()) return null;
      return await getOrgExamStudentCard(backendUrl, token!, orgId!, sessionId, studentId);
    },
    [backendUrl, token, orgId]
  );

  const emailStudentCard = useCallback(
    async (sessionId: string, studentId: number, toOverride?: string) => {
      if (!ensure()) return { ok: false } as { ok: boolean; to?: string };
      return await sendOrgExamStudentCardEmail(backendUrl, token!, orgId!, sessionId, studentId, toOverride);
    },
    [backendUrl, token, orgId]
  );

  const fetchAnalytics = useCallback(
    async (sessionId: string) => {
      if (!ensure()) return;
      setAnalyticsLoading(true);
      try {
        const rows = await getOrgExamAnalytics(backendUrl, token!, orgId!, sessionId);
        setAnalytics(rows);
      } finally {
        setAnalyticsLoading(false);
      }
    },
    [backendUrl, token, orgId]
  );

  const downloadStudentCardPdf = useCallback(
    async (sessionId: string, studentId: number, fileName?: string) => {
      if (!ensure()) return;
      try {
        const url = `${backendUrl}/api/orgs/${orgId}/exams/student/${studentId}/card.pdf?sessionId=${encodeURIComponent(
          sessionId
        )}`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          alert(`Failed to download PDF (HTTP ${res.status})`);
          return;
        }
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName || 'exam-report.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(blobUrl);
      } catch (e: any) {
        console.error(e);
        alert(e?.message || 'Failed to download PDF');
      }
    },
    [backendUrl, token, orgId]
  );

  const downloadClassReportPdf = useCallback(
  async (sessionId: string, classLabel: string, fileName: string) => {
    if (!sessionId) throw new Error('Missing sessionId');
    if (!orgId) throw new Error('Missing orgId');

    const params = new URLSearchParams();
    if (classLabel) params.set('classLabel', classLabel);
    params.set('format', 'booklet'); // hint for backend to use the fancy layout

    const url = `${backendUrl}/api/orgs/${orgId}/exams/sessions/${sessionId}/class-report.pdf?${params.toString()}`;

    const resp = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(text || 'Failed to download class report');
    }

    const blob = await resp.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
  [backendUrl, orgId, token],
);

  return {
    // config
    config,
    configLoading,
    fetchConfig,
    saveConfig,
    // sheet
    sheetRows,
    sheetLoading,
    savingSheet,
    fetchSheet,
    saveSheet,
    // analytics & reports
    analytics,
    analyticsLoading,
    fetchAnalytics,
    fetchStudentCard,
    emailStudentCard,
    downloadStudentCardPdf,
    downloadClassReportPdf,
  };
}
