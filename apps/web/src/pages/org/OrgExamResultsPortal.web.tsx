// apps/web/src/pages/org/OrgExamResultsPortal.web.tsx
/* eslint-disable no-console */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopContext } from '@mytutorapp/shared/context';
import { getMyOrgOrBootstrap } from '@mytutorapp/shared/api';
import type { OrgResp as Org } from '@mytutorapp/shared/api/orgApi';
import { getOrgRoster } from '@mytutorapp/shared/api/orgApi';
import { useOrgExams } from '@mytutorapp/shared/hooks';
import type {
  OrgExamConfig,
  OrgExamTerm,
  OrgExamSession,
  OrgExamGradingBand,
  OrgExamResultRow,
} from '@mytutorapp/shared/types';

const TAB_BTN_BASE =
  'group relative inline-flex items-center justify-center h-10 sm:h-11 px-4 sm:px-6 rounded-xl ' +
  'font-bold text-sm sm:text-base tracking-wide transition-all ' +
  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#3d99f5]/60 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-[#0a0f15]';

type ViewTab = 'setup' | 'marks' | 'reports';

const emptyConfig: OrgExamConfig = {
  terms: [],
  sessions: [],
  gradingBands: [],
};

const bandPresets: OrgExamGradingBand[] = [
  { grade: 'A', min_percent: 80, max_percent: 100, remark: 'Excellent' },
  { grade: 'B', min_percent: 70, max_percent: 79.99, remark: 'Very good' },
  { grade: 'C', min_percent: 60, max_percent: 69.99, remark: 'Good' },
  { grade: 'D', min_percent: 50, max_percent: 59.99, remark: 'Fair' },
  { grade: 'E', min_percent: 0, max_percent: 49.99, remark: 'Needs improvement' },
];

// Small helper to build safe filenames
const slugify = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'report';

// Shape for roster learners (from OrgProfile / getOrgRoster)
type OrgRosterLearner = {
  id: number | string;
  name?: string | null;
  email?: string | null;
  admission_code?: string | null;
  class_label?: string | null;
};

// ── Helpers for percentages, ordinals & remarks ──────────────────────────────

const percentOf = (score: any, max: any): number | null => {
  const s = Number(score);
  const m = Number(max);
  if (!Number.isFinite(s) || !Number.isFinite(m) || m <= 0) return null;
  return (s / m) * 100;
};

const ordinal = (n: number | null | undefined): string => {
  if (!n || !Number.isFinite(n)) return '';
  const v = n % 100;
  const suffix =
    v >= 11 && v <= 13
      ? 'th'
      : ['th', 'st', 'nd', 'rd'][Math.min(n % 10, 3)] || 'th';
  return `${n}${suffix}`;
};

type AutoRemarksArgs = {
  name: string;
  percent: number | null;
  overallGrade?: string | null;
  classRank?: number | null;
  classSize?: number | null;
  bestSubject?: string | null;
  bestPercent?: number | null;
  weakestSubject?: string | null;
  weakestPercent?: number | null;
};

const buildAutoRemarks = ({
  name,
  percent,
  overallGrade,
  classRank,
  classSize,
  bestSubject,
  bestPercent,
  weakestSubject,
  weakestPercent,
}: AutoRemarksArgs): string => {
  const pieces: string[] = [];

  const displayName = name || 'This learner';
  if (percent != null) {
    pieces.push(
      `${displayName} achieved an overall score of ${percent.toFixed(
        1,
      )}%${
        overallGrade ? ` (grade ${overallGrade})` : ''
      }, reflecting their effort and engagement this term.`,
    );
  }

  if (classRank && classSize) {
    pieces.push(
      `In the class, ${displayName.toLowerCase()} ranked ${ordinal(
        classRank,
      )} out of ${classSize} learners.`,
    );
  }

  if (bestSubject && bestPercent != null) {
    pieces.push(
      `Strongest performance was in ${bestSubject} at about ${Math.round(
        bestPercent,
      )}%, showing confidence and understanding in this area.`,
    );
  }

  if (weakestSubject && weakestPercent != null) {
    pieces.push(
      `More focused support is recommended in ${weakestSubject}, where the score was around ${Math.round(
        weakestPercent,
      )}%.`,
    );
  }

  if (!pieces.length) {
    pieces.push(
      `${displayName} has made noticeable progress this term. Continued effort and support will help unlock even better outcomes.`,
    );
  }

  pieces.push(
    'Parents/guardians are encouraged to celebrate the wins, discuss the areas that need improvement, and agree on 1–3 practical action steps for the coming term.',
  );

  return pieces.join(' ');
};

/**
 * Try to extract a simple historic series for the learner.
 * Backend can later provide: card.progressSeries / card.history / card.previousSummaries …
 */
const buildProgressSeries = (card: any): { label: string; percent: number }[] => {
  if (!card) return [];

  const seriesSource =
    card.progressSeries ||
    card.history ||
    card.previousSummaries ||
    card.previous_terms ||
    [];

  const out: { label: string; percent: number }[] = [];

  if (Array.isArray(seriesSource)) {
    seriesSource.forEach((p: any, idx: number) => {
      const label =
        p.label ||
        p.termLabel ||
        p.term ||
        p.name ||
        p.examLabel ||
        `Term ${idx + 1}`;
      const percent =
        typeof p.percent === 'number'
          ? p.percent
          : typeof p.totalPercent === 'number'
          ? p.totalPercent
          : null;
      if (percent != null) {
        out.push({ label, percent });
      }
    });
  }

  if (!out.length && typeof card?.summary?.totalPercent === 'number') {
    out.push({ label: 'This exam', percent: card.summary.totalPercent });
  }

  return out;
};


const OrgExamResultsPortal: React.FC = () => {
  const navigate = useNavigate();
  const { backendUrl, token: userToken, orgToken } = useShopContext();
  const authToken = orgToken || userToken || '';
  const [org, setOrg] = useState<Org | null>(null);
  const orgId = org?.id ?? '';
  const [studentCard, setStudentCard] = useState<any | null>(null);
  const [reportRemarks, setReportRemarks] = useState<string | null>(null);

  const [tab, setTab] = useState<ViewTab>('marks');

  const {
    config,
    configLoading,
    fetchConfig,
    saveConfig,
    sheetRows,
    sheetLoading,
    savingSheet,
    fetchSheet,
    saveSheet,
    analytics,
    analyticsLoading,
    fetchAnalytics,
    fetchStudentCard,
    emailStudentCard,
    downloadStudentCardPdf,
  } = useOrgExams({ backendUrl, token: authToken, orgId });

  const cfg = config ?? emptyConfig;

  const [editingConfig, setEditingConfig] = useState<OrgExamConfig>(emptyConfig);

  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [classLabel, setClassLabel] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');

  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentCardText, setStudentCardText] = useState<string | null>(null);
  const [studentCardMeta, setStudentCardMeta] = useState<{
    studentName: string;
    overallGrade?: string | null;
  } | null>(null);

  // Roster learners for this org (for marks entry selector)
  const [rosterLearners, setRosterLearners] = useState<OrgRosterLearner[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  // Inline "Add row" state
  const [newStudentId, setNewStudentId] = useState<string>('');
  const [newSubject, setNewSubject] = useState<string>('');

  // Load org
  useEffect(() => {
    if (!authToken) {
      navigate('/org/login', { replace: true });
      return;
    }
    (async () => {
      try {
        const o = await getMyOrgOrBootstrap(backendUrl, authToken);
        setOrg(o);
      } catch (e) {
        console.warn('[OrgExamPortal] Failed to load org', e);
      }
    })();
  }, [backendUrl, authToken, navigate]);

  // Load config once org is ready
  useEffect(() => {
    if (!orgId || !authToken) return;
    void fetchConfig();
  }, [orgId, authToken, fetchConfig]);

  // Load roster once org is ready
  useEffect(() => {
    if (!orgId || !authToken) return;
    (async () => {
      setRosterLoading(true);
      try {
        const roster = await getOrgRoster(backendUrl, authToken, orgId);
        const learners = Array.isArray(roster?.learners) ? roster.learners : [];
        setRosterLearners(learners as OrgRosterLearner[]);
      } catch (e) {
        console.warn('[OrgExamPortal] Failed to load org roster', e);
      } finally {
        setRosterLoading(false);
      }
    })();
  }, [backendUrl, authToken, orgId]);

  // Keep editable copy in sync
  useEffect(() => {
    if (!config) return;
    setEditingConfig(config);
  }, [config]);

  const ensureSessionSelected = () => {
    if (!selectedSessionId) {
      alert('Please select a term and exam session first.');
      return false;
    }
    return true;
  };

  // Marks: fetch sheet when session/class changes
  useEffect(() => {
    if (!selectedSessionId) return;
    void fetchSheet(selectedSessionId, classLabel || undefined);
    void fetchAnalytics(selectedSessionId);
  }, [selectedSessionId, classLabel, fetchSheet, fetchAnalytics]);

  const handleAddTerm = () => {
    const year = new Date().getFullYear();
    const label = window.prompt('Term label (e.g. "Term 1"):', `Term ${editingConfig.terms.length + 1}`);
    if (!label) return;
    const next: OrgExamTerm = {
      id: crypto.randomUUID(),
      label,
      year,
      is_active: true,
    };
    setEditingConfig((prev) => ({ ...prev, terms: [...prev.terms, next] }));
  };

  const handleAddSession = () => {
    if (!editingConfig.terms.length) {
      alert('Add at least one term first.');
      return;
    }
    const label = window.prompt('Exam label (e.g. "Midterm"):', 'Midterm');
    if (!label) return;
    const termId = selectedTermId || editingConfig.terms[0].id;
    const next: OrgExamSession = {
      id: crypto.randomUUID(),
      term_id: termId,
      label,
      weight: 1,
      starts_at: null,
      ends_at: null,
    };
    setEditingConfig((prev) => ({ ...prev, sessions: [...prev.sessions, next] }));
  };

  const handleApplyBandsPreset = () => {
    const withSort = bandPresets.map((b, idx) => ({
      ...b,
      sort_order: idx,
    }));
    setEditingConfig((prev) => ({ ...prev, gradingBands: withSort }));
  };

  const handleSaveConfig = async () => {
    try {
      await saveConfig(editingConfig);
      alert('Exam configuration saved.');
    } catch (e: any) {
      console.error('[OrgExamPortal] save config error', e);

      const maybeData = e?.response?.data;
      const serverMessage =
        (maybeData && (maybeData.message || maybeData.error)) ||
        e?.message ||
        'Failed to save configuration';

      alert(serverMessage);
    }
  };

  const handleSaveSheet = async () => {
    if (!ensureSessionSelected()) return;
    try {
      await saveSheet(selectedSessionId, classLabel || undefined, sheetRows);
      alert('Marks saved.');
    } catch (e: any) {
      console.error('[OrgExamPortal] save marks error', e);

      const maybeData = e?.response?.data;
      const serverMessage =
        (maybeData && (maybeData.message || maybeData.error)) ||
        e?.message ||
        'Failed to save marks';

      alert(serverMessage);
    }
  };

     const handleOpenStudentCard = async (studentId: number) => {
    if (!ensureSessionSelected()) return;

    // Remember which student is active
    setSelectedStudentId(studentId);

    // Jump to the Reports tab so the user can SEE the card
    setTab('reports');

    // Reset + show a loading message in the preview panel
    setStudentCard(null);
    setStudentCardText('Loading report card…');
    setStudentCardMeta(null);
    setReportRemarks(null);

    try {
      const card: any = await fetchStudentCard(selectedSessionId, studentId);

      if (!card) {
        setStudentCardText('No report data found for this learner yet.');
        return;
      }

      // ── Compute positions from current sheet rows ──────────────────────────
      const classKey = (classLabel || card.student?.class_label || '')
        .toString()
        .toLowerCase()
        .trim();

      // sheetRows is already scoped to selectedSessionId by fetchSheet
      const rowsInClass = sheetRows.filter((r) => {
        if (!classKey) return true;
        const rowClass = (r.class_label || '').toString().toLowerCase();
        return rowClass.includes(classKey);
      });

      // Overall totals per learner
      const totalsByStudent = new Map<
        number,
        { totalScore: number; totalMax: number; percent: number }
      >();

      for (const r of rowsInClass) {
        const sid = Number(r.student_user_id);
        if (!Number.isFinite(sid)) continue;
        const s = Number(r.score) || 0;
        const m = Number(r.max_score) || 0;
        const prev = totalsByStudent.get(sid) || {
          totalScore: 0,
          totalMax: 0,
          percent: 0,
        };
        const nextTotalScore = prev.totalScore + s;
        const nextTotalMax = prev.totalMax + m;
        const nextPercent =
          nextTotalMax > 0 ? (nextTotalScore / nextTotalMax) * 100 : 0;
        totalsByStudent.set(sid, {
          totalScore: nextTotalScore,
          totalMax: nextTotalMax,
          percent: nextPercent,
        });
      }

      const overallSorted = Array.from(totalsByStudent.entries()).sort(
        (a, b) => b[1].percent - a[1].percent,
      );
      const classSize = overallSorted.length;
      const overallIdx = overallSorted.findIndex(([id]) => id === studentId);
      const overallRank = overallIdx >= 0 ? overallIdx + 1 : null;

      // Subject-wise positions within this class
      const subjectPositions: Record<
        string,
        { rank: number | null; size: number; meanPercent: number | null }
      > = {};

      // Pre-group rows by subject
      const rowsBySubject = new Map<string, OrgExamResultRow[]>();
      for (const r of rowsInClass) {
        const key = (r.subject || '').toString().toLowerCase();
        if (!rowsBySubject.has(key)) rowsBySubject.set(key, []);
        rowsBySubject.get(key)!.push(r);
      }

      card.subjects.forEach((s: any) => {
        const subKey = (s.subject || '').toString().toLowerCase();
        const subjectRows = rowsBySubject.get(subKey) || [];
        if (!subjectRows.length) {
          subjectPositions[subKey] = {
            rank: null,
            size: 0,
            meanPercent: null,
          };
          return;
        }

        const withPerc = subjectRows
          .map((r) => {
            const p = percentOf(r.score, r.max_score) ?? 0;
            return { studentId: Number(r.student_user_id), percent: p };
          })
          .sort((a, b) => b.percent - a.percent);

        const size = withPerc.length;
        const idx = withPerc.findIndex((row) => row.studentId === studentId);
        const rank = idx >= 0 ? idx + 1 : null;
        const meanPercent =
          withPerc.reduce((acc, r) => acc + r.percent, 0) / size || null;

        subjectPositions[subKey] = { rank, size, meanPercent };
      });

      // Best / weakest subjects by percent
      let best: { subject: string; percent: number } | null = null;
      let weakest: { subject: string; percent: number } | null = null;

      card.subjects.forEach((s: any) => {
        const p = percentOf(s.score, s.max_score);
        if (p == null) return;
        if (!best || p > best.percent) best = { subject: s.subject, percent: p };
        if (!weakest || p < weakest.percent)
          weakest = { subject: s.subject, percent: p };
      });

      const overallPercent: number | null =
        typeof card.summary?.totalPercent === 'number'
          ? card.summary.totalPercent
          : null;

      // ── Enrich card for the UI ────────────────────────────────────────────
      const enrichedCard = {
        ...card,
        summary: {
          ...card.summary,
          totalPercent: overallPercent,
          classRank: overallRank,
          classSize,
        },
        subjects: card.subjects.map((s: any) => {
          const key = (s.subject || '').toString().toLowerCase();
          const pos = subjectPositions[key];
          const subjectPercent = percentOf(s.score, s.max_score);
          return {
            ...s,
            percent: subjectPercent,
            classRank: pos?.rank ?? null,
            classSize: pos?.size ?? null,
            classMeanPercent: pos?.meanPercent ?? null,
          };
        }),
                computed: {
          bestSubject: (best as { subject: string; percent: number } | null)?.subject || null,
          bestPercent: (best as { subject: string; percent: number } | null)?.percent ?? null,
          weakestSubject: (weakest as { subject: string; percent: number } | null)?.subject || null,
          weakestPercent: (weakest as { subject: string; percent: number } | null)?.percent ?? null,
        },

      };

      setStudentCard(enrichedCard);

      // Text snapshot (still useful if you ever want to copy raw text)
      const lines: string[] = [];
      lines.push(`${card.student.name} – Report`);
      lines.push('');
      enrichedCard.subjects.forEach((s: any) => {
        const baseLine = `${s.subject}: ${s.score}/${s.max_score}`;
        const percentStr =
          s.percent != null ? ` (${Math.round(s.percent)}%)` : '';
        const gradeStr = s.grade ? ` – ${s.grade}` : '';
        const posStr =
          s.classRank && s.classSize
            ? ` – position ${ordinal(s.classRank)} of ${s.classSize}`
            : '';
        lines.push(baseLine + percentStr + gradeStr + posStr);
      });
      lines.push('');
      if (overallPercent != null) {
        const posStr =
          overallRank && classSize
            ? ` – position ${ordinal(overallRank)} of ${classSize}`
            : '';
        lines.push(
          `Total: ${card.summary.totalScore}/${card.summary.totalMax} (${overallPercent.toFixed(
            1,
          )}%) – ${card.summary.overallGrade || ''}${posStr}`,
        );
      }
      setStudentCardText(lines.join('\n'));

      // capture meta for smart filename
      setStudentCardMeta({
        studentName: card.student.name || 'Student',
        overallGrade: card.summary.overallGrade,
      });

      // Auto remarks
      const remarks = buildAutoRemarks({
        name: card.student.name || 'This learner',
        percent: overallPercent,
        overallGrade: card.summary.overallGrade,
        classRank: overallRank,
        classSize,
        bestSubject: enrichedCard.computed.bestSubject,
        bestPercent: enrichedCard.computed.bestPercent,
        weakestSubject: enrichedCard.computed.weakestSubject,
        weakestPercent: enrichedCard.computed.weakestPercent,
      });
      setReportRemarks(remarks);
    } catch (e: any) {
      console.error('[OrgExamPortal] fetchStudentCard error', e);
      setStudentCard(null);
      setStudentCardText(null);
      setReportRemarks(null);
      alert(e?.message || 'Failed to load report card');
    }
  };



  const handleEmailStudentCard = async (studentId: number) => {
    if (!ensureSessionSelected()) return;
    const maybeTo = window.prompt('Send report to (leave blank to use guardian/student email):', '');
    try {
      const resp = await emailStudentCard(selectedSessionId, studentId, maybeTo || undefined);
      if (!resp.ok) {
        alert('Failed to queue email.');
      } else {
        alert(`Report queued to: ${resp.to || '(guardian/student email)'}`);
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Failed to queue exam email');
    }
  };

  const filteredSheetRows = useMemo(() => {
    if (!subjectFilter) return sheetRows;
    return sheetRows.filter((r) =>
      String(r.subject || '').toLowerCase().includes(subjectFilter.toLowerCase())
    );
  }, [sheetRows, subjectFilter]);

  const groupedByStudent = useMemo(() => {
    const map = new Map<number, OrgExamResultRow[]>();
    for (const row of filteredSheetRows) {
      const id = Number(row.student_user_id);
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(row);
    }
    return map;
  }, [filteredSheetRows]);

  const selectedSession = cfg.sessions.find((s) => s.id === selectedSessionId) || null;
  const selectedTerm = cfg.terms.find((t) => t.id === selectedSession?.term_id) || null;

  const handleDownloadPdf = useCallback(() => {
    if (!selectedStudentId || !ensureSessionSelected()) return;

    const studentName = studentCardMeta?.studentName || 'student';
    const termPart = selectedTerm ? `${selectedTerm.year}-${selectedTerm.label}` : '';
    const examPart = selectedSession?.label || '';
    const classPart = classLabel || '';
    const gradePart = studentCardMeta?.overallGrade || '';

    const pieces = [studentName, classPart, termPart, examPart, gradePart, 'report-card']
      .map((p) => p.trim())
      .filter(Boolean);

    const base = slugify(pieces.join('_'));
    const fileName = `${base}.pdf`;

    void downloadStudentCardPdf(selectedSessionId, selectedStudentId, fileName);
  }, [
    selectedStudentId,
    selectedSessionId,
    ensureSessionSelected,
    downloadStudentCardPdf,
    studentCardMeta,
    selectedTerm,
    selectedSession,
    classLabel,
  ]);

  // Map learner by ID (for admission_code / class_label lookups in table)
  const learnerById = useMemo(() => {
    const m = new Map<number, OrgRosterLearner>();
    for (const l of rosterLearners) {
      const idNum = Number(l.id);
      if (Number.isFinite(idNum)) {
        m.set(idNum, l);
      }
    }
    return m;
  }, [rosterLearners]);

  // Learner options for selector, filtered by classLabel
  const learnerOptions = useMemo(() => {
    const classFilter = classLabel.trim().toLowerCase();
    const filtered = rosterLearners.filter((l) => {
      if (!classFilter) return true;
      if (!l.class_label) return false;
      return l.class_label.toLowerCase().includes(classFilter);
    });
    return filtered.map((l) => {
      const displayBase = l.name || l.email || `User #${l.id}`;
      const withAdm = l.admission_code ? `${l.admission_code} – ${displayBase}` : displayBase;
      const withClass = l.class_label ? `${withAdm} (${l.class_label})` : withAdm;
      return {
        value: String(l.id),
        label: withClass,
      };
    });
  }, [rosterLearners, classLabel]);

  const handleAddRowFromRoster = () => {
    if (!ensureSessionSelected()) return;
    if (!newStudentId || !newSubject.trim()) {
      alert('Select a learner and enter a subject.');
      return;
    }
    const studentIdNum = Number(newStudentId);
    if (!Number.isFinite(studentIdNum)) {
      alert('Invalid learner selection.');
      return;
    }

    const meta = learnerById.get(studentIdNum);

    const newRow: OrgExamResultRow = {
      student_user_id: studentIdNum,
      subject: newSubject.trim(),
      score: 0,
      max_score: 100,
      class_label: classLabel || meta?.class_label || undefined,
      // backend can also enrich admission_code; we keep it on the learner/profile
    };

  const next = [...sheetRows, newRow];
  void saveSheet(selectedSessionId, classLabel || undefined, next);

  // Reset inline form
  setNewStudentId('');
  setNewSubject('');
};

 // 🚀 Bulk add: create rows for ALL learners in the current class for this subject
  const handleBulkAddClassForSubject = () => {
    if (!ensureSessionSelected()) return;

    const subject = newSubject.trim();
    const classKey = classLabel.trim().toLowerCase();

    if (!classKey) {
      alert('Enter the class label above (e.g. "Grade 7 Maple") before bulk adding.');
      return;
    }
    if (!subject) {
      alert('Enter the subject name before bulk adding.');
      return;
    }

    // Learners that belong to this class (by class_label)
    const classLearners = rosterLearners.filter((l) => {
      if (!l.class_label) return false;
      return l.class_label.toLowerCase().includes(classKey);
    });

    if (!classLearners.length) {
      alert('No learners in roster match this class label.');
      return;
    }

    // Avoid duplicates: build a key of existing (student, subject)
    const existing = new Set(
      sheetRows.map((r) => `${r.student_user_id}::${String(r.subject || '').toLowerCase()}`)
    );

    const additions: OrgExamResultRow[] = [];

    for (const l of classLearners) {
      const idNum = Number(l.id);
      if (!Number.isFinite(idNum)) continue;

      const key = `${idNum}::${subject.toLowerCase()}`;
      if (existing.has(key)) continue; // already has a row for this subject

      additions.push({
        student_user_id: idNum,
        subject,
        score: 0,
        max_score: 100,
        class_label: l.class_label || classLabel || undefined,
      });
    }

    if (!additions.length) {
      alert('All learners in this class already have rows for this subject.');
      return;
    }

    const next = [...sheetRows, ...additions];
    void saveSheet(selectedSessionId, classLabel || undefined, next);
  };


  // For little helper text on how many learners are currently selectable
  const visibleLearnerCount = learnerOptions.length;

  return (
    <div
      className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-darkBg text-[#0d141c] dark:text-darkTextPrimary overflow-x-hidden"
      style={{ fontFamily: `Manrope, "Noto Sans", sans-serif` }}
    >
      <main className="flex-1 flex justify-center py-6 px-3 sm:px-4 lg:px-10">
        <div className="flex flex-col w-full max-w-[1200px]">
          {/* Header */}
          <section className="px-1 sm:px-0">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex min-w-60 sm:min-w-72 flex-col gap-1">
                <h1 className="text-[24px] sm:text-[28px] md:text-[32px] font-bold leading-tight">
                  Exam Results &amp; Reports
                </h1>
                <p className="text-[#49739c] dark:text-darkTextSecondary text-xs sm:text-sm">
                  Record marks, auto-grade, and send rich report cards to parents.
                </p>
              </div>

              {/* View tabs */}
              <div
                role="tablist"
                aria-label="Exam views"
                className="inline-flex items-center rounded-2xl p-1.5 bg-white/80 dark:bg-[#0b1420]/80 ring-2 ring-[#3d99f5] dark:ring-[#3d99f5]/90 shadow-xl backdrop-blur supports-[backdrop-filter]:backdrop-blur"
              >
                <button
                  role="tab"
                  aria-selected={tab === 'setup'}
                  aria-pressed={tab === 'setup'}
                  onClick={() => setTab('setup')}
                  className={[
                    TAB_BTN_BASE,
                    tab === 'setup'
                      ? 'bg-[#3d99f5] text-white shadow-lg ring-1 ring-[#3d99f5]'
                      : 'bg-transparent text-[#0d141c] dark:text-darkTextPrimary ring-1 ring-[#3d99f5]/60 hover:bg-[#e7edf4]/80 dark:hover:bg-white/5',
                  ].join(' ')}
                >
                  Setup
                </button>
                <button
                  role="tab"
                  aria-selected={tab === 'marks'}
                  aria-pressed={tab === 'marks'}
                  onClick={() => setTab('marks')}
                  className={[
                    TAB_BTN_BASE,
                    'ml-1.5',
                    tab === 'marks'
                      ? 'bg-[#3d99f5] text-white shadow-lg ring-1 ring-[#3d99f5]'
                      : 'bg-transparent text-[#0d141c] dark:text-darkTextPrimary ring-1 ring-[#3d99f5]/60 hover:bg-[#e7edf4]/80 dark:hover:bg-white/5',
                  ].join(' ')}
                >
                  Marks entry
                </button>
                <button
                  role="tab"
                  aria-selected={tab === 'reports'}
                  aria-pressed={tab === 'reports'}
                  onClick={() => setTab('reports')}
                  className={[
                    TAB_BTN_BASE,
                    'ml-1.5',
                    tab === 'reports'
                      ? 'bg-[#3d99f5] text-white shadow-lg ring-1 ring-[#3d99f5]'
                      : 'bg-transparent text-[#0d141c] dark:text-darkTextPrimary ring-1 ring-[#3d99f5]/60 hover:bg-[#e7edf4]/80 dark:hover:bg-white/5',
                  ].join(' ')}
                >
                  Reports &amp; analytics
                </button>
              </div>
            </div>
          </section>

          {/* Current selection summary */}
          <section className="mt-4 sm:mt-5">
            <div className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] px-3 sm:px-4 py-3 sm:py-4 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs sm:text-sm font-semibold text-[#49739c] dark:text-darkTextSecondary">
                  Active selection:
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#e7edf4] dark:bg-[#172534]">
                  Term: {selectedTerm?.label ?? '—'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#e7edf4] dark:bg-[#172534]">
                  Exam: {selectedSession?.label ?? '—'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-[#e7edf4] dark:bg-[#172534]">
                  Class: {classLabel || '—'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <select
                  className="h-9 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] text-xs sm:text-sm px-2"
                  value={selectedTermId}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                >
                  <option value="">Select term</option>
                  {cfg.terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.year} – {t.label}
                    </option>
                  ))}
                </select>
                <select
                  className="h-9 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] text-xs sm:text-sm px-2"
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                >
                  <option value="">Select exam</option>
                  {cfg.sessions
                    .filter((s) => !selectedTermId || s.term_id === selectedTermId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                </select>
                <input
                  className="h-9 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] text-xs sm:text-sm px-3 min-w-[120px]"
                  placeholder="Class (e.g. Grade 7 Maple)"
                  value={classLabel}
                  onChange={(e) => setClassLabel(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Main content */}
          <section className="mt-4 sm:mt-6 space-y-4 sm:space-y-5">
            {tab === 'setup' && (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Terms & sessions */}
                <div className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm sm:text-base font-bold">Terms &amp; exams</h2>
                    <button
                      className="h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                      onClick={handleAddTerm}
                    >
                      + Add term
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[260px] overflow-y-auto">
                    {editingConfig.terms.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-xl border border-[#e7edf4] dark:border-darkCard bg-slate-50/70 dark:bg-[#0b1420] p-2.5 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">
                            {t.year} – {t.label}
                          </span>
                          <label className="flex items-center gap-1 text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                            <input
                              type="checkbox"
                              checked={t.is_active}
                              onChange={(e) =>
                                setEditingConfig((prev) => ({
                                  ...prev,
                                  terms: prev.terms.map((x) =>
                                    x.id === t.id ? { ...x, is_active: e.target.checked } : x
                                  ),
                                }))
                              }
                            />
                            Active
                          </label>
                        </div>
                        <div className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                          Exams:{' '}
                          {editingConfig.sessions
                            .filter((s) => s.term_id === t.id)
                            .map((s) => s.label)
                            .join(', ') || 'none yet'}
                        </div>
                      </div>
                    ))}

                    {!editingConfig.terms.length && (
                      <div className="text-xs text-[#49739c] dark:text-darkTextSecondary">
                        No terms yet. Add at least one term to begin using exams.
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[#49739c] dark:text-darkTextSecondary">
                        Exam sessions
                      </span>
                      <span className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                        Attach exams to terms and assign weight for yearly averages.
                      </span>
                    </div>
                    <button
                      className="h-9 px-3 rounded-xl bg-[#3d99f5] text-white text-xs font-semibold"
                      onClick={handleAddSession}
                    >
                      + Add exam
                    </button>
                  </div>

                  <div className="max-h-[220px] overflow-y-auto space-y-1">
                    {editingConfig.sessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 text-xs rounded-lg px-2 py-1 bg-[#e7edf4] dark:bg-[#172534]"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold">{s.label}</span>
                          <span className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                            {editingConfig.terms.find((t) => t.id === s.term_id)?.label || 'Unassigned'} • weight{' '}
                            {s.weight}
                          </span>
                        </div>
                      </div>
                    ))}

                    {!editingConfig.sessions.length && (
                      <div className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                        No exams configured yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Grading bands */}
                <div className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-3 sm:p-4 flex flex-col">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold">Grading bands</h2>
                      <p className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                        Used to auto-grade each subject and overall score.
                      </p>
                    </div>
                    <button
                      className="h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                      onClick={handleApplyBandsPreset}
                    >
                      Use default preset
                    </button>
                  </div>

                  <div className="mt-3 flex-1 overflow-y-auto">
                    <table className="min-w-full text-xs sm:text-sm">
                      <thead className="text-left text-[#49739c] dark:text-darkTextSecondary">
                        <tr>
                          <th className="py-1 pr-2">Grade</th>
                          <th className="py-1 pr-2">% range</th>
                          <th className="py-1 pr-2">Remark</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingConfig.gradingBands.map((b, idx) => (
                          <tr key={idx} className="border-t border-[#e7edf4] dark:border-darkCard">
                            <td className="py-1 pr-2">
                              <input
                                className="w-16 h-8 rounded-lg border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-2 text-xs"
                                value={b.grade}
                                onChange={(e) =>
                                  setEditingConfig((prev) => {
                                    const bands = [...prev.gradingBands];
                                    bands[idx] = { ...bands[idx], grade: e.target.value };
                                    return { ...prev, gradingBands: bands };
                                  })
                                }
                              />
                            </td>
                            <td className="py-1 pr-2">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  className="w-16 h-8 rounded-lg border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-1 text-xs"
                                  value={b.min_percent}
                                  onChange={(e) =>
                                    setEditingConfig((prev) => {
                                      const bands = [...prev.gradingBands];
                                      bands[idx] = {
                                        ...bands[idx],
                                        min_percent: Number(e.target.value) || 0,
                                      };
                                      return { ...prev, gradingBands: bands };
                                    })
                                  }
                                />
                                <span className="text-[11px]">to</span>
                                <input
                                  type="number"
                                  className="w-16 h-8 rounded-lg border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-1 text-xs"
                                  value={b.max_percent}
                                  onChange={(e) =>
                                    setEditingConfig((prev) => {
                                      const bands = [...prev.gradingBands];
                                      bands[idx] = {
                                        ...bands[idx],
                                        max_percent: Number(e.target.value) || 0,
                                      };
                                      return { ...prev, gradingBands: bands };
                                    })
                                  }
                                />
                              </div>
                            </td>
                            <td className="py-1 pr-2">
                              <input
                                className="w-full h-8 rounded-lg border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-2 text-xs"
                                value={b.remark ?? ''}
                                onChange={(e) =>
                                  setEditingConfig((prev) => {
                                    const bands = [...prev.gradingBands];
                                    bands[idx] = { ...bands[idx], remark: e.target.value };
                                    return { ...prev, gradingBands: bands };
                                  })
                                }
                              />
                            </td>
                          </tr>
                        ))}
                        {!editingConfig.gradingBands.length && (
                          <tr>
                            <td colSpan={3} className="py-3 text-xs text-[#49739c] dark:text-darkTextSecondary">
                              No grading bands yet. Click “Use default preset”.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      className="h-9 px-4 rounded-xl bg-[#3d99f5] text-white text-sm font-semibold"
                      onClick={handleSaveConfig}
                      disabled={configLoading}
                    >
                      {configLoading ? 'Saving…' : 'Save configuration'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === 'marks' && (
              <div className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-3 sm:p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-sm sm:text-base font-bold">Marks entry</h2>
                    <p className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                      One row per learner &amp; subject. The system will auto-grade on save.
                    </p>
                    <p className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                      Roster learners: {rosterLoading ? 'Loading…' : rosterLearners.length || '0'} •
                      &nbsp;Selectable for this class:{' '}
                      {classLabel.trim() ? visibleLearnerCount : 'all'}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
                    <input
                      className="h-9 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] text-xs sm:text-sm px-3 flex-1"
                      placeholder="Filter by subject"
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        className="h-9 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] text-xs sm:text-sm px-2 min-w-[160px]"
                        value={newStudentId}
                        onChange={(e) => setNewStudentId(e.target.value)}
                        disabled={rosterLoading || !rosterLearners.length}
                      >
                        <option value="">
                          {rosterLoading
                            ? 'Loading learners…'
                            : rosterLearners.length
                            ? classLabel.trim()
                              ? 'Select learner for this class…'
                              : 'Select learner…'
                            : 'No learners in roster'}
                        </option>
                        {learnerOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <input
                        className="h-9 rounded-xl border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] text-xs sm:text-sm px-3 min-w-[140px]"
                        placeholder="Subject name"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                      />

                      {/* Single learner add */}
                      <button
                        className="h-9 px-3 rounded-xl bg-[#3d99f5] text-white text-xs sm:text-sm font-semibold disabled:opacity-50"
                        onClick={handleAddRowFromRoster}
                        disabled={
                          !selectedSessionId || !newStudentId || !newSubject.trim() || rosterLoading
                        }
                      >
                        + Add row
                      </button>

                      {/* 🚀 Bulk add all learners in this class for this subject */}
                      <button
                        className="h-9 px-3 rounded-xl bg-[#0f172a] dark:bg-white text-white dark:text-[#0f172a] text-[11px] sm:text-xs font-semibold disabled:opacity-40"
                        onClick={handleBulkAddClassForSubject}
                        disabled={
                          !selectedSessionId ||
                          !classLabel.trim() ||
                          !newSubject.trim() ||
                          rosterLoading ||
                          !visibleLearnerCount
                        }
                        title="Use the Class field above + Subject name to create rows for the whole class."
                      >
                        Add class roster
                      </button>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#cedbe8] dark:border-darkCard bg-slate-50 dark:bg-[#0f1821]">
                  <table className="min-w-[950px] w-full text-xs sm:text-sm">
                    <thead className="bg-slate-100 dark:bg-[#0f1821] text-left">
                      <tr>
                        <th className="px-3 py-2">Student ID</th>
                        <th className="px-3 py-2">Adm. code</th>
                        <th className="px-3 py-2">Name / Email</th>
                        <th className="px-3 py-2">Subject</th>
                        <th className="px-3 py-2">Score</th>
                        <th className="px-3 py-2">Out of</th>
                        <th className="px-3 py-2">% / Grade</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sheetLoading && (
                        <tr>
                          <td colSpan={8} className="px-3 py-4 text-sm">
                            Loading marks…
                          </td>
                        </tr>
                      )}
                      {!sheetLoading &&
                        filteredSheetRows.map((r, idx) => {
                          const percent =
                            r.score != null && r.max_score
                              ? Math.round((Number(r.score) / Number(r.max_score)) * 100)
                              : null;

                          const meta = learnerById.get(Number(r.student_user_id));
                          const admissionCode =
                            (r as any).admission_code ?? meta?.admission_code ?? null;

                          return (
                            <tr
                              key={`${r.student_user_id}-${r.subject}-${idx}`}
                              className="border-t border-[#cedbe8] dark:border-darkCard"
                            >
                              <td className="px-3 py-2">{r.student_user_id}</td>
                              <td className="px-3 py-2">
                                {admissionCode ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-[#e7edf4] dark:bg-[#172534] font-semibold">
                                    {admissionCode}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                                    —
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="font-medium text-xs sm:text-sm">
                                  {r.student_name || '—'}
                                </div>
                                {r.student_email && (
                                  <div className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                                    {r.student_email}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2">{r.subject}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  className="w-20 h-8 rounded-lg border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-2 text-xs"
                                  value={r.score}
                                    onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    const copy = [...sheetRows];
                                    copy[idx] = { ...copy[idx], score: val };
                                    void saveSheet(selectedSessionId, classLabel || undefined, copy);
                                  }}

                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  className="w-20 h-8 rounded-lg border border-[#cedbe8] dark:border-darkCard bg-white dark:bg-[#0f1821] px-2 text-xs"
                                  value={r.max_score}
                                                                    onChange={(e) => {
                                    const val = Number(e.target.value) || 0;
                                    const copy = [...sheetRows];
                                    copy[idx] = { ...copy[idx], max_score: val };
                                    void saveSheet(selectedSessionId, classLabel || undefined, copy);
                                  }}

                                />
                              </td>
                              <td className="px-3 py-2">
                                {percent != null ? (
                                  <span className="text-xs sm:text-sm">
                                    {percent}% {r.grade ? `• ${r.grade}` : ''}
                                  </span>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  className="h-8 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-[11px] font-semibold mr-1"
                                  onClick={() => handleOpenStudentCard(r.student_user_id)}
                                >
                                  Card
                                </button>
                                <button
                                  className="h-8 px-3 rounded-xl bg-[#3d99f5] text-white text-[11px] font-semibold"
                                  onClick={() => handleEmailStudentCard(r.student_user_id)}
                                >
                                  Email
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      {!sheetLoading && !filteredSheetRows.length && (
                        <tr>
                          <td colSpan={8} className="px-3 py-4 text-sm text-[#49739c] dark:text-darkTextSecondary">
                            No marks yet for this exam/class. Start by adding rows using the learner selector above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end">
                  <button
                    className="h-9 px-4 rounded-xl bg-[#3d99f5] text-white text-sm font-semibold disabled:opacity-60"
                    onClick={handleSaveSheet}
                    disabled={savingSheet}
                  >
                    {savingSheet ? 'Saving…' : 'Save all marks'}
                  </button>
                </div>
              </div>
            )}

            {tab === 'reports' && (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Analytics card */}
                <div className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold">Subject analytics</h2>
                      <p className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                        Distribution per subject for this exam.
                      </p>
                    </div>
                    <button
                      className="h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] text-xs font-semibold"
                      onClick={() => selectedSessionId && fetchAnalytics(selectedSessionId)}
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-xs sm:text-sm">
                      <thead className="text-left text-[#49739c] dark:text-darkTextSecondary">
                        <tr>
                          <th className="py-1 pr-3">Subject</th>
                          <th className="py-1 pr-3">Scripts</th>
                          <th className="py-1 pr-3">Avg %</th>
                          <th className="py-1 pr-3">Min %</th>
                          <th className="py-1 pr-3">Max %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analyticsLoading && (
                          <tr>
                            <td colSpan={5} className="py-3 text-sm">
                              Loading analytics…
                            </td>
                          </tr>
                        )}
                        {!analyticsLoading &&
                          analytics.map((r, idx) => (
                            <tr key={idx} className="border-t border-[#e7edf4] dark:border-darkCard">
                              <td className="py-1 pr-3">{r.subject}</td>
                              <td className="py-1 pr-3">{r.scripts}</td>
                              <td className="py-1 pr-3">{r.avg_percent}</td>
                              <td className="py-1 pr-3">{r.min_percent}</td>
                              <td className="py-1 pr-3">{r.max_percent}</td>
                            </tr>
                          ))}
                        {!analyticsLoading && !analytics.length && (
                          <tr>
                            <td colSpan={5} className="py-3 text-xs text-[#49739c] dark:text-darkTextSecondary">
                              No analytics yet. Ensure there are marks for this exam.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                                {/* Student card preview */}
                <div className="rounded-2xl ring-1 ring-[#e7edf4] dark:ring-darkCard bg-white dark:bg-[#0f1821] p-3 sm:p-4 flex flex-col">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm sm:text-base font-bold">Report card preview</h2>
                      <p className="text-[11px] text-[#49739c] dark:text-darkTextSecondary">
                        Select any learner in Marks view and click “Card” to preview a full modern report.
                      </p>
                    </div>
                    {selectedStudentId && (
                      <button
                        className="h-8 px-3 rounded-xl bg-[#3d99f5] text-white text-[11px] font-semibold"
                        onClick={handleDownloadPdf}
                      >
                        Download PDF
                      </button>
                    )}
                  </div>

                  <div className="mt-3 flex-1 rounded-xl border border-[#e7edf4] dark:border-darkCard bg-slate-50 dark:bg-[#0b1420] p-3 text-[11px] sm:text-xs overflow-y-auto">
                    {/* Loading / empty states */}
                    {!studentCard && !studentCardText && (
                      <div className="text-[#49739c] dark:text-darkTextSecondary">
                        No report selected yet.
                      </div>
                    )}
                    {!studentCard && studentCardText && (
                      <pre className="whitespace-pre-wrap">
                        {studentCardText}
                      </pre>
                    )}

                    {/* Rich card view */}
                    {studentCard && (
                      <div className="space-y-3">
                        {/* Header: learner + overall stats */}
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-[12px] font-semibold uppercase tracking-wide text-[#49739c] dark:text-darkTextSecondary">
                              {org?.name || 'School'}
                            </div>
                            <div className="text-sm sm:text-base font-bold">
                              {studentCard.student?.name || 'Learner'}
                            </div>
                            <div className="flex flex-wrap gap-1 text-[10px] text-[#49739c] dark:text-darkTextSecondary">
                              {studentCard.student?.admission_code && (
                                <span className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-[#111827] border border-[#e7edf4] dark:border-darkCard">
                                  Adm: {studentCard.student.admission_code}
                                </span>
                              )}
                              {(classLabel || studentCard.student?.class_label) && (
                                <span className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-[#111827] border border-[#e7edf4] dark:border-darkCard">
                                  Class: {classLabel || studentCard.student?.class_label}
                                </span>
                              )}
                              {selectedTerm && (
                                <span className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-[#111827] border border-[#e7edf4] dark:border-darkCard">
                                  {selectedTerm.year} – {selectedTerm.label}
                                </span>
                              )}
                              {selectedSession && (
                                <span className="px-2 py-0.5 rounded-full bg-white/70 dark:bg-[#111827] border border-[#e7edf4] dark:border-darkCard">
                                  Exam: {selectedSession.label}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <div className="text-[10px] uppercase tracking-wide text-[#49739c] dark:text-darkTextSecondary">
                              Overall performance
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl sm:text-2xl font-extrabold">
                                {typeof studentCard.summary?.totalPercent === 'number'
                                  ? `${studentCard.summary.totalPercent.toFixed(1)}%`
                                  : '—'}
                              </span>
                              {studentCard.summary?.overallGrade && (
                                <span className="px-2 py-0.5 rounded-full bg-[#3d99f5] text-white text-[10px] font-semibold">
                                  Grade {studentCard.summary.overallGrade}
                                </span>
                              )}
                            </div>
                            {studentCard.summary?.classRank && studentCard.summary?.classSize && (
                              <div className="text-[10px] text-[#49739c] dark:text-darkTextSecondary">
                                Position{' '}
                                <span className="font-semibold">
                                  {ordinal(studentCard.summary.classRank)}
                                </span>{' '}
                                out of {studentCard.summary.classSize}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Body: subjects table + side stats / graph */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          {/* Subjects & positions */}
                          <div className="rounded-lg bg-white dark:bg-[#020617] border border-[#e7edf4] dark:border-darkCard p-2.5">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-[11px] font-semibold">
                                Subject breakdown
                              </h3>
                              <span className="text-[10px] text-[#49739c] dark:text-darkTextSecondary">
                                Score • Grade • Position
                              </span>
                            </div>
                            <div className="max-h-[220px] overflow-y-auto">
                              <table className="w-full text-[10px]">
                                <thead className="text-[#49739c] dark:text-darkTextSecondary text-left">
                                  <tr>
                                    <th className="py-1 pr-2">Subject</th>
                                    <th className="py-1 pr-2 text-right">Score</th>
                                    <th className="py-1 pr-2 text-right">% / Grade</th>
                                    <th className="py-1 pr-0 text-right">Pos.</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {studentCard.subjects.map((s: any, idx: number) => (
                                    <tr
                                      key={`${s.subject}-${idx}`}
                                      className="border-t border-[#e7edf4] dark:border-darkCard"
                                    >
                                      <td className="py-1 pr-2">
                                        {s.subject || '—'}
                                      </td>
                                      <td className="py-1 pr-2 text-right">
                                        {s.score}/{s.max_score}
                                      </td>
                                      <td className="py-1 pr-2 text-right">
                                        {typeof s.percent === 'number'
                                          ? `${Math.round(s.percent)}%`
                                          : '—'}{' '}
                                        {s.grade ? `• ${s.grade}` : ''}
                                      </td>
                                      <td className="py-1 pr-0 text-right">
                                        {s.classRank && s.classSize ? (
                                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#e7edf4] dark:bg-[#111827] text-[9px] font-semibold">
                                            {ordinal(s.classRank)} / {s.classSize}
                                          </span>
                                        ) : (
                                          <span className="text-[9px] text-[#9ca3af]">
                                            —
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Key stats + progress graph */}
                          <div className="space-y-2.5">
                            {/* Key stats */}
                            <div className="rounded-lg bg-white dark:bg-[#020617] border border-[#e7edf4] dark:border-darkCard p-2.5">
                              <h3 className="text-[11px] font-semibold mb-1">
                                Highlights
                              </h3>
                              <ul className="space-y-0.5 text-[10px] text-[#111827] dark:text-darkTextPrimary">
                                {studentCard.computed?.bestSubject && (
                                  <li>
                                    <span className="font-semibold">Strength: </span>
                                    {studentCard.computed.bestSubject} (
                                    {studentCard.computed.bestPercent != null
                                      ? `${Math.round(
                                          studentCard.computed.bestPercent,
                                        )}%`
                                      : '—'}
                                    )
                                  </li>
                                )}
                                {studentCard.computed?.weakestSubject && (
                                  <li>
                                    <span className="font-semibold">Focus area: </span>
                                    {studentCard.computed.weakestSubject} (
                                    {studentCard.computed.weakestPercent != null
                                      ? `${Math.round(
                                          studentCard.computed.weakestPercent,
                                        )}%`
                                      : '—'}
                                    )
                                  </li>
                                )}
                                {studentCard.summary?.totalPercent != null &&
                                  typeof studentCard.summary?.classRank === 'number' &&
                                  typeof studentCard.summary?.classSize === 'number' && (
                                    <li>
                                      <span className="font-semibold">Overall: </span>
                                      {studentCard.summary.totalPercent.toFixed(1)}% –{' '}
                                      position {ordinal(studentCard.summary.classRank)} of{' '}
                                      {studentCard.summary.classSize}
                                    </li>
                                  )}
                              </ul>
                            </div>

                            {/* Progress bar graph */}
                            <div className="rounded-lg bg-white dark:bg-[#020617] border border-[#e7edf4] dark:border-darkCard p-2.5">
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="text-[11px] font-semibold">
                                  Progress over time
                                </h3>
                                <span className="text-[10px] text-[#49739c] dark:text-darkTextSecondary">
                                  % scores by term / exam
                                </span>
                              </div>
                              {(() => {
                                const series = buildProgressSeries(studentCard);
                                if (!series.length) {
                                  return (
                                    <div className="text-[10px] text-[#49739c] dark:text-darkTextSecondary">
                                      Historical data not available yet. Once previous exams
                                      are synced, this chart will show the learner&apos;s
                                      trend.
                                    </div>
                                  );
                                }
                                return (
                                  <div className="space-y-1.5">
                                    {series.map((p, idx) => (
                                      <div key={`${p.label}-${idx}`}>
                                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                                          <span>{p.label}</span>
                                          <span className="font-semibold">
                                            {p.percent.toFixed(1)}%
                                          </span>
                                        </div>
                                        <div className="h-2 rounded-full bg-[#e5e7eb] dark:bg-[#111827] overflow-hidden">
                                          <div
                                            className="h-2 rounded-full bg-[#3d99f5]"
                                            style={{
                                              width: `${Math.max(
                                                5,
                                                Math.min(100, p.percent),
                                              )}%`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </div>

                        {/* Remarks */}
                        <div className="rounded-lg bg-white dark:bg-[#020617] border border-[#e7edf4] dark:border-darkCard p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <h3 className="text-[11px] font-semibold">Remarks</h3>
                            <span className="text-[10px] text-[#49739c] dark:text-darkTextSecondary">
                              Class teacher / Principal
                            </span>
                          </div>
                          <p className="leading-relaxed text-[10px] text-[#111827] dark:text-darkTextPrimary">
                            {reportRemarks ||
                              'No auto-remarks generated yet. Save marks and reopen the card to refresh.'}
                          </p>
                          <div className="mt-2 grid sm:grid-cols-2 gap-2 text-[10px] text-[#49739c] dark:text-darkTextSecondary">
                            <div>
                              Class teacher:&nbsp;
                              <span className="inline-block min-w-[120px] border-b border-dotted border-[#9ca3af]" />
                            </div>
                            <div>
                              Head teacher / Principal:&nbsp;
                              <span className="inline-block min-w-[120px] border-b border-dotted border-[#9ca3af]" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default OrgExamResultsPortal;
