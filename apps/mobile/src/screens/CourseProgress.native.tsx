/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  LayoutChangeEvent,
  Linking,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import debounce from 'lodash.debounce';
import tw from '../../tailwind';

import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses, useOerMeta } from '@mytutorapp/shared/hooks';
import { useCourseProgress } from '@mytutorapp/shared/hooks/useCourseProgress';
import { useCourseReviews } from '@mytutorapp/shared/hooks/useCourseReviews';
import { useWatchProgress } from '@mytutorapp/shared/hooks/useWatchProgress';
import { useReadProgress } from '@mytutorapp/shared/hooks/useReadProgress';

import CertificateButton from './CertificateButton.native';
import CourseReadingPanel from './CourseReadingPanel.native';

import type {
  Course as CourseType,
  CourseProgress as CourseProgressItem,
  UpdateProgressPayload,
  SyllabusItem,
} from '@mytutorapp/shared/types';

type Status = 'Not Started' | 'In Progress' | 'Completed';

/* ----------------------------- helpers ----------------------------- */
const slug = (s: string) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'document';

const extractCertId = (doc: any): string | null => {
  if (!doc) return null;
  const direct = doc?.certId || doc?.certificateId || doc?.id;
  if (typeof direct === 'string' && direct) return direct;
  const u = String(doc?.download_url || doc?.downloadUrl || doc?.url || '');
  const m =
    u.match(/\/certificates\/([^/]+)\/(?:download|view|raw)?/i) ||
    u.match(/[?&]certId=([^&]+)/i);
  return m?.[1] ?? null;
};

const extractTranscriptId = (doc: any): string | null => {
  if (!doc) return null;
  const direct = doc?.transcriptId || doc?.id;
  if (typeof direct === 'string' && direct) return direct;
  const u = String(doc?.download_url || doc?.url || '');
  const m = u.match(/\/transcripts\/([^/]+)\/(?:download|view|raw)?/i);
  return m?.[1] ?? null;
};

// normalize videos for a week (supports string or array)
const getWeekVideos = (w?: any): { provider: 'youtube'; url: string }[] => {
  const urls: string[] = [];
  if (Array.isArray(w?.videoUrls)) urls.push(...(w.videoUrls as string[]).filter(Boolean));
  if (typeof w?.videoUrl === 'string' && w.videoUrl) urls.push(w.videoUrl as string);
  return urls.map((u) => ({ provider: 'youtube', url: u }));
};

const getYoutubeId = (input = ''): string => {
  try {
    const u = new URL(input);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/').pop() || '';
      return u.searchParams.get('v') || '';
    }
  } catch {}
  return input;
};
/* ------------------------------------------------------------------ */

export default function CourseProgress() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const courseId: string | undefined = route?.params?.courseId ?? route?.params?.id;
  const courseIdS: string = courseId ?? '';

  const { backendUrl, token, profile } = useShopContext();
  const myId = String(profile?.id ?? '');

  // OER meta (used to unlock transcript/free certificate)
  const oerMeta = useOerMeta(courseIdS);

  // Load course
  const {
    selectedCourse,
    loading: coursesLoading,
    error: coursesError,
    fetchCourseById,
  } = useCourses({ backendUrl, token });

  useEffect(() => {
    if (courseIdS) void fetchCourseById(courseIdS);
  }, [courseIdS, fetchCourseById]);

  // Progress
  const { progress = [], loading: progressLoading, update } = useCourseProgress(
    backendUrl,
    courseIdS,
    token
  );

  const syllabus: SyllabusItem[] = useMemo(() => {
    const raw = (selectedCourse as CourseType | null | undefined)?.syllabus;
    return Array.isArray(raw) ? (raw as SyllabusItem[]) : [];
  }, [selectedCourse]);

  const isLoading = coursesLoading || progressLoading;

  // Reviews
  const { hasMyReview, submit, posting } = useCourseReviews(
    backendUrl,
    courseIdS,
    { myStudentId: myId, token: token ?? '' }
  );

  const [openReview, setOpenReview] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const onSubmitReview = useCallback(async () => {
    if (rating < 1) return;
    await submit?.(rating, comment);
    setOpenReview(false);
    setRating(0);
    setComment('');
  }, [submit, rating, comment]);

  const promptReview = useCallback(() => {
    if (!hasMyReview) setOpenReview(true);
  }, [hasMyReview]);

  const debouncedPrompt = useMemo(() => debounce(promptReview, 200), [promptReview]);
  useEffect(() => () => debouncedPrompt.cancel(), [debouncedPrompt]);

  // Map week -> status
  const progressByWeek = useMemo(() => {
    const map = new Map<number, Status>();
    (progress as CourseProgressItem[]).forEach((p) => {
      if (typeof p?.week === 'number') {
        map.set(p.week, (p.status as Status) ?? 'Not Started');
      }
    });
    return map;
  }, [progress]);

  // Watch & Read progress (client/local)
  const { rows: watchRows, sendEvent, reload: reloadWatch } = useWatchProgress(courseIdS);
  const { rows: readRows } = useReadProgress(courseIdS);

  const readAllForWeek = useCallback(
    (week?: number | null) => {
      if (week == null) return true;
      const item = syllabus.find((s) => s.week === week);
      const urls: string[] = [];
      if (Array.isArray((item as any)?.notesUrls)) {
        urls.push(...(((item as any).notesUrls as string[]) || []).filter(Boolean));
      }
      if (typeof (item as any)?.notesUrl === 'string' && (item as any).notesUrl) {
        urls.push((item as any).notesUrl);
      }
      if (!urls.length) return true;

      const done = new Set(
        readRows.filter((r: any) => r.week === week && r.completed).map((r: any) => r.source_url)
      );
      return urls.every((u) => done.has(u));
    },
    [syllabus, readRows]
  );

  const watchedAllForWeek = useCallback(
    (week?: number | null) => {
      if (!week && week !== 0) return true;
      const item = syllabus.find((s) => s.week === week);
      const vids = getWeekVideos(item);
      if (!vids.length) return true;
      const done = new Set(
        watchRows.filter((r: any) => r.week === week && r.completed).map((r: any) => r.video_id)
      );
      return vids.every((v) => done.has(getYoutubeId(v.url)));
    },
    [syllabus, watchRows]
  );

  const courseWatchedAll = useMemo(() => {
    const requiredIds = syllabus
      .flatMap((s) => getWeekVideos(s).map((v) => getYoutubeId(v.url)))
      .filter(Boolean);
    if (requiredIds.length === 0) return true;
    const done = new Set(watchRows.filter((r: any) => r.completed).map((r: any) => r.video_id));
    return requiredIds.every((id) => done.has(id));
  }, [syllabus, watchRows]);

  const remainingCount = useMemo(() => {
    const requiredIds = syllabus
      .flatMap((s) => getWeekVideos(s).map((v) => getYoutubeId(v.url)))
      .filter(Boolean);
    const done = new Set(watchRows.filter((r: any) => r.completed).map((r: any) => r.video_id));
    return requiredIds.filter((id) => !done.has(id)).length;
  }, [syllabus, watchRows]);

  // Counts + suggested
  const counts = useMemo(() => {
    let notStarted = 0,
      inProgress = 0,
      completed = 0;
    syllabus.forEach((s) => {
      const st = (progressByWeek.get(s.week) ?? 'Not Started') as Status;
      if (st === 'Completed') completed++;
      else if (st === 'In Progress') inProgress++;
      else notStarted++;
    });
    const total = syllabus.length || 0;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    return { notStarted, inProgress, completed, total, pct };
  }, [syllabus, progressByWeek]);

  const suggestedWeek = useMemo(() => {
    const inProg = syllabus.find(
      (w) => (progressByWeek.get(w.week) ?? 'Not Started') === 'In Progress'
    );
    if (inProg) return inProg.week;
    const notSt = syllabus.find(
      (w) => (progressByWeek.get(w.week) ?? 'Not Started') === 'Not Started'
    );
    if (notSt) return notSt.week;
    return syllabus.length ? syllabus[syllabus.length - 1]?.week : undefined;
  }, [syllabus, progressByWeek]);

  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const activeItem = activeWeek == null ? null : syllabus.find((w) => w.week === activeWeek);
  const weekVideos = useMemo(() => getWeekVideos(activeItem), [activeItem]);
  const watchedAllActive = useMemo(
    () => watchedAllForWeek(activeWeek),
    [watchedAllForWeek, activeWeek]
  );

  // Scroll to suggested
  const rowLayoutsRef = useRef<Record<number, { y: number; h: number }>>({});
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (activeWeek == null && suggestedWeek != null) {
      const layout = rowLayoutsRef.current[suggestedWeek];
      if (layout && scrollRef.current) {
        scrollRef.current.scrollTo({ y: Math.max(0, layout.y - 12), animated: true });
      }
    }
  }, [activeWeek, suggestedWeek]);

  // Watch actions (native-friendly)
  const [watchTarget, setWatchTarget] = useState<{ title?: string; url: string } | null>(null);

  const openWatch = (v: { title?: string; url: string }) => {
    setWatchTarget(v);
    const url = v.url || '';
    const webUrl = url.includes('youtube.com') || url.includes('youtu.be') ? url : `https://youtu.be/${url}`;
    Linking.openURL(webUrl).catch(() => Alert.alert('Could not open video', webUrl));
    Alert.alert('Watching video', 'After finishing, tap “I’ve finished” to mark it watched.');
  };

  const markWatchedNow = async (url: string) => {
    if (activeWeek == null) return;
    const id = getYoutubeId(url);
    try {
      // Mark as complete by sending equal watched/duration values
      await sendEvent({
        week: activeWeek,
        provider: 'youtube',
        videoId: id,
        watchedSeconds: 600,
        durationSeconds: 600,
      } as any);
      reloadWatch();
    } catch (e) {
      Alert.alert('Failed', 'Could not mark as watched. Please try again.');
    }
  };

  // Early exits
  if (!courseIdS) {
    return (
      <View style={tw`max-w-xl mx-auto p-6`}>
        <Text style={tw`text-red-600`}>Missing course id.</Text>
      </View>
    );
  }
  if (isLoading) {
    return (
      <View style={tw`max-w-xl mx-auto p-6`}>
        <Text style={tw`text-gray-700`}>Loading progress…</Text>
      </View>
    );
  }
  if (coursesError) {
    return (
      <View style={tw`max-w-xl mx-auto p-6`}>
        <Text style={tw`text-red-600`}>Failed to load course.</Text>
      </View>
    );
  }
  if (!selectedCourse) {
    return (
      <View style={tw`max-w-xl mx-auto p-6`}>
        <Text style={tw`text-2xl font-bold mb-2`}>Course</Text>
        <Text style={tw`text-gray-600`}>Course not found.</Text>
        <View style={tw`mt-4`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`rounded-xl h-10 px-4 bg-gray-100 justify-center`}
          >
            <Text style={tw`text-sm font-semibold`}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  if (syllabus.length === 0) {
    return (
      <View style={tw`max-w-xl mx-auto p-6`}>
        <Text style={tw`text-2xl font-bold`}>{selectedCourse.title ?? 'Course'}</Text>
        <Text style={tw`text-gray-600`}>This course doesn’t have a syllabus yet.</Text>
        <View style={tw`mt-4`}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`rounded-xl h-10 px-4 bg-gray-100 justify-center`}
          >
            <Text style={tw`text-sm font-semibold`}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Update status with gating prompt
  const setStatus = async (week: number, status: Status) => {
    if (status === 'Completed') {
      if (!watchedAllForWeek(week)) {
        Alert.alert('Finish videos', 'Please watch all required videos for this week first.');
        return;
      }
      if (!readAllForWeek(week)) {
        Alert.alert('Finish reading', 'Please finish the required reading for this week first.');
        return;
      }
    }
    const payload: UpdateProgressPayload = { courseId: courseIdS, week, status };
    try {
      await update?.(payload);
      if (status === 'Completed') debouncedPrompt();
    } catch {}
  };

  const startCourse = async () => {
    if (!syllabus.length) return;
    const first = syllabus[0]?.week;
    if (typeof first !== 'number') return;
    const st = (progressByWeek.get(first) ?? 'Not Started') as Status;
    if (st === 'Not Started') await setStatus(first, 'In Progress');
    setActiveWeek(first);
  };

  const continueCourse = async () => {
    if (suggestedWeek == null) return;
    const st = (progressByWeek.get(suggestedWeek) ?? 'Not Started') as Status;
    if (st === 'Not Started') await setStatus(suggestedWeek, 'In Progress');
    setActiveWeek(suggestedWeek);
  };

  const completeCurrent = async () => {
    if (suggestedWeek == null) return;
    if (!watchedAllForWeek(suggestedWeek)) {
      Alert.alert('Finish videos', 'Please watch all required videos for this week first.');
      return;
    }
    if (!readAllForWeek(suggestedWeek)) {
      Alert.alert('Finish reading', 'Please finish the required reading for this week first.');
      return;
    }
    await setStatus(suggestedWeek, 'Completed');
  };

  const allCompleted = counts.total > 0 && counts.completed === counts.total;

  // Prev/Next
  const goPrev = () => {
    if (activeWeek == null) return;
    const idx = syllabus.findIndex((w) => w.week === activeWeek);
    if (idx > 0) {
      const prev = syllabus[idx - 1];
      if (prev) setActiveWeek(prev.week);
    }
  };
  const goNext = () => {
    if (activeWeek == null) return;
    const idx = syllabus.findIndex((w) => w.week === activeWeek);
    if (idx < syllabus.length - 1) {
      const nxt = syllabus[idx + 1];
      if (nxt) setActiveWeek(nxt.week);
    }
  };

  const activeStatus: Status =
    activeWeek == null ? 'Not Started' : (progressByWeek.get(activeWeek) ?? 'Not Started');

  /* ---------------- Transcript (OER) ---------------- */
  const [downloadingTranscript, setDownloadingTranscript] = useState(false);
  const downloadOerTranscript = useCallback(async () => {
    if (!courseIdS) return;
    if (!courseWatchedAll) {
      Alert.alert(
        'Locked',
        `Watch all videos to unlock transcript${remainingCount ? ` (${remainingCount} remaining)` : ''}.`
      );
      return;
    }
    try {
      setDownloadingTranscript(true);

      const lessons = (syllabus || [])
        .map((s) => String(s.topic || (s as any)?.title || `Week ${s.week}`).trim())
        .filter(Boolean);

      const payload: any = { courseId: courseIdS, lessonsLearnt: lessons };

      let r = await fetch(`${backendUrl}/api/transcripts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (r.status === 404) {
        const rr = await fetch(`${backendUrl}/api/oer/transcript/${encodeURIComponent(courseIdS)}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        const t2 = await rr.json().catch(() => ({}));
        const trId2 = extractTranscriptId(t2);
        const anyUrl2 = t2?.download_url || t2?.url || null;
        if (trId2 || anyUrl2) {
          await Linking.openURL(
            anyUrl2 || `${backendUrl}/api/transcripts/${encodeURIComponent(trId2!)}/download`
          );
        } else {
          Alert.alert('Transcript', 'Generated, but no download link was returned.');
        }
        return;
      }

      const t = await r.json().catch(() => ({}));
      const trId = extractTranscriptId(t);
      const anyUrl = t?.download_url || t?.url || null;
      if (trId || anyUrl) {
        await Linking.openURL(
          anyUrl || `${backendUrl}/api/transcripts/${encodeURIComponent(trId!)}/download`
        );
      } else {
        Alert.alert('Transcript', 'Generated, but no download link was returned.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not generate/download transcript. Please try again.');
    } finally {
      setDownloadingTranscript(false);
    }
  }, [backendUrl, token, courseIdS, syllabus, courseWatchedAll, remainingCount]);

  /* ---------------- Certificate (OER) ---------------- */
  const [issuingCert, setIssuingCert] = useState(false);
  const generateFreeOerCertificate = useCallback(async () => {
    if (!courseIdS) return;
    if (!courseWatchedAll) {
      Alert.alert('Locked', 'Please watch all course videos before generating a certificate.');
      return;
    }
    try {
      setIssuingCert(true);
      let r = await fetch(`${backendUrl}/api/oer/certificates/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ courseId: courseIdS }),
      });

      if (r.status === 404) {
        r = await fetch(`${backendUrl}/api/certificates/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ courseId: courseIdS, free: true, tier: 'oer' }),
        });
      }

      const d = await r.json().catch(() => ({}));
      const certId = extractCertId(d);
      const anyUrl = d?.download_url || d?.downloadUrl || d?.url || null;
      if (certId || anyUrl) {
        await Linking.openURL(
          anyUrl || `${backendUrl}/api/certificates/${encodeURIComponent(certId!)}/download`
        );
      } else {
        Alert.alert('Certificate', 'Generated, but no download link was returned.');
      }
    } catch (e) {
      Alert.alert('Error', 'Could not generate your certificate. Please try again.');
    } finally {
      setIssuingCert(false);
    }
  }, [backendUrl, token, courseIdS, courseWatchedAll]);

  /* --------------------------- UI --------------------------- */
  return (
    <ScrollView
      ref={scrollRef}
      contentContainerStyle={tw`max-w-3xl w-full self-center px-4 py-8 gap-y-10`}
    >
      {/* Header */}
      <View style={tw`gap-y-2`}>
        <Text style={tw`text-2xl font-bold`}>{selectedCourse?.title ?? 'Course'}</Text>
        {!!selectedCourse?.description && (
          <Text style={tw`text-gray-600`}>{selectedCourse.description}</Text>
        )}

        {/* Overall progress */}
        <View style={tw`mt-2`}>
          <View style={tw`flex-row items-center justify-between`}>
            <Text style={tw`text-sm text-gray-600`}>Overall progress</Text>
            <Text style={tw`text-sm text-gray-600`}>
              {counts.pct}% ({counts.completed}/{counts.total})
            </Text>
          </View>
          <View style={tw`h-2 w-full rounded bg-[#e5eef7] overflow-hidden mt-1`}>
            <View style={[tw`h-2 bg-[#3d99f5]`, { width: `${counts.pct}%` }]} />
          </View>
          <View style={tw`flex-row gap-x-3 mt-2`}>
            <Text style={tw`text-xs text-gray-500`}>Not started: {counts.notStarted}</Text>
            <Text style={tw`text-xs text-gray-500`}>• In progress: {counts.inProgress}</Text>
            <Text style={tw`text-xs text-gray-500`}>• Completed: {counts.completed}</Text>
          </View>
        </View>

        {/* Primary actions */}
        <View style={tw`flex-row flex-wrap gap-2 mt-3`}>
          {counts.completed === 0 && counts.inProgress === 0 ? (
            <TouchableOpacity
              onPress={startCourse}
              style={tw`rounded-xl h-10 px-4 bg-[#3d99f5] justify-center`}
            >
              <Text style={tw`text-white text-sm font-semibold`}>Start course</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={continueCourse}
              style={tw`rounded-xl h-10 px-4 bg-[#3d99f5] justify-center`}
            >
              <Text style={tw`text-white text-sm font-semibold`}>
                Continue where I left off
              </Text>
            </TouchableOpacity>
          )}

          {(counts.inProgress + counts.notStarted > 0) && (
            <TouchableOpacity
              onPress={completeCurrent}
              disabled={
                suggestedWeek == null ||
                !watchedAllForWeek(suggestedWeek) ||
                !readAllForWeek(suggestedWeek)
              }
              style={tw.style(
                `rounded-xl h-10 px-4 bg-white border border-[#cedbe8] justify-center`,
                (suggestedWeek == null ||
                  !watchedAllForWeek(suggestedWeek) ||
                  !readAllForWeek(suggestedWeek)) && `opacity-60`
              )}
            >
              <Text style={tw`text-sm font-semibold`}>Mark current week completed</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={tw`rounded-xl h-10 px-4 bg-white border border-[#cedbe8] justify-center`}
          >
            <Text style={tw`text-sm font-semibold`}>Back</Text>
          </TouchableOpacity>

          {/* Transcript (OER) — gated by full-course watch */}
          {!!oerMeta && (
            <TouchableOpacity
              onPress={downloadOerTranscript}
              disabled={downloadingTranscript || !courseWatchedAll}
              style={tw.style(
                `rounded-xl h-10 px-4 bg-white border border-[#cedbe8] justify-center`,
                (!courseWatchedAll || downloadingTranscript) && `opacity-60`
              )}
            >
              <Text style={tw`text-sm font-semibold`}>
                {downloadingTranscript ? 'Preparing…' : 'Download Transcript (Free)'}
              </Text>
            </TouchableOpacity>
          )}

          {allCompleted && !hasMyReview && (
            <TouchableOpacity
              onPress={() => setOpenReview(true)}
              style={tw`rounded-xl h-10 px-4 bg-[#e7edf4] justify-center`}
            >
              <Text style={tw`text-sm font-semibold`}>Rate this course</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Reading Mode */}
      {activeWeek != null && (
        <View style={tw`gap-y-4`}>
          {activeItem ? (
            <>
              <CourseReadingPanel
                courseId={courseIdS}
                week={activeWeek as number}
                item={activeItem as SyllabusItem}
                status={activeStatus}
                onSetStatus={(next: Status) => setStatus(activeWeek as number, next)}
              />

              {/* Required videos (native-friendly) */}
              {weekVideos.length > 0 && (
                <View style={tw`rounded-xl border border-[#cedbe8] p-3`}>
                  <Text style={tw`text-sm font-semibold mb-2`}>Required videos for this week</Text>
                  <View style={tw`gap-y-2`}>
                    {weekVideos.map((v, i) => {
                      const id = getYoutubeId(v.url);
                      const row = (watchRows as any[]).find(
                        (r: any) => r.week === activeWeek && r.video_id === id
                      );
                      const done = !!row?.completed;
                      return (
                        <View
                          key={`${id}-${i}`}
                          style={tw`flex-row items-center justify-between`}
                        >
                          <Text style={tw`text-sm`}>{`Video ${i + 1}`}</Text>
                          <View style={tw`flex-row items-center gap-2`}>
                            <Text style={tw.style(`text-xs`, done ? `text-emerald-600` : `text-[#49739c]`)}>
                              {done ? 'Watched' : 'Not watched'}
                            </Text>
                            <TouchableOpacity
                              style={tw`h-8 px-3 rounded-lg border border-[#cedbe8] justify-center`}
                              onPress={() => openWatch({ title: `Video ${i + 1}`, url: v.url })}
                            >
                              <Text style={tw`text-xs font-semibold`}>Watch now</Text>
                            </TouchableOpacity>
                            {!done && (
                              <TouchableOpacity
                                style={tw`h-8 px-3 rounded-lg bg-[#e7edf4] justify-center`}
                                onPress={() => markWatchedNow(v.url)}
                              >
                                <Text style={tw`text-xs font-semibold`}>I’ve finished</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  {!watchedAllActive && (
                    <Text style={tw`mt-2 text-xs text-[#49739c]`}>
                      You must watch all videos to complete this week.
                    </Text>
                  )}
                </View>
              )}

              <View style={tw`flex-row flex-wrap items-center gap-2`}>
                <TouchableOpacity
                  onPress={goPrev}
                  disabled={syllabus.findIndex((w) => w.week === activeWeek) === 0}
                  style={tw.style(
                    `rounded-xl h-10 px-4 justify-center`,
                    syllabus.findIndex((w) => w.week === activeWeek) === 0
                      ? `bg-gray-200`
                      : `bg-white border border-[#cedbe8]`
                  )}
                >
                  <Text style={tw`text-sm font-semibold`}>← Previous week</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveWeek(null)}
                  style={tw`rounded-xl h-10 px-4 bg-[#e7edf4] justify-center`}
                >
                  <Text style={tw`text-sm font-semibold`}>Exit reading</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={goNext}
                  disabled={syllabus.findIndex((w) => w.week === activeWeek) === syllabus.length - 1}
                  style={tw.style(
                    `rounded-xl h-10 px-4 justify-center`,
                    syllabus.findIndex((w) => w.week === activeWeek) === syllabus.length - 1
                      ? `bg-gray-200`
                      : `bg-white border border-[#cedbe8]`
                  )}
                >
                  <Text style={tw`text-sm font-semibold`}>Next week →</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={tw`rounded-2xl border border-gray-200 bg-white p-4`}>
              <Text style={tw`text-sm text-gray-700`}>
                Week {activeWeek} isn’t available. Choose another week below.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Weeks list */}
      <View style={tw`gap-y-3`}>
        {syllabus.map((item) => {
          const current: Status = (progressByWeek.get(item.week) ?? 'Not Started') as Status;
          const isSuggested = item.week === suggestedWeek;
          const canComplete = watchedAllForWeek(item.week) && readAllForWeek(item.week);

          const onLayout = (e: LayoutChangeEvent) => {
            const { y, height } = e.nativeEvent.layout;
            rowLayoutsRef.current[item.week] = { y, h: height };
          };

          const quickStart = async () => {
            await setStatus(item.week, 'In Progress');
            setActiveWeek(item.week);
          };

          return (
            <View
              key={item.week}
              onLayout={onLayout}
              style={tw.style(
                `p-4 rounded-xl bg-white`,
                isSuggested ? `border border-[#3d99f5]` : `border border-[#cedbe8]`
              )}
            >
              <View style={tw`mb-2`}>
                <Text style={tw`font-medium text-gray-900`}>
                  Week {item.week}: {item.topic || 'TBA'}
                </Text>
                <Text style={tw`text-sm text-gray-500`}>
                  Status: {current}
                  {isSuggested ? ' • current' : ''}
                </Text>
              </View>

              <View style={tw`flex-row items-center gap-2`}>
                {current === 'Not Started' && (
                  <TouchableOpacity
                    onPress={quickStart}
                    style={tw`rounded-lg h-9 px-3 bg-[#e7edf4] justify-center`}
                  >
                    <Text style={tw`text-sm font-semibold`}>Start week</Text>
                  </TouchableOpacity>
                )}

                {current !== 'Completed' && (
                  <TouchableOpacity
                    onPress={() => {
                      if (!canComplete) {
                        Alert.alert(
                          'Not ready',
                          'Please watch all required videos (and reading, if any) first.'
                        );
                        return;
                      }
                      setStatus(item.week, 'Completed');
                    }}
                    disabled={!canComplete}
                    style={tw.style(
                      `rounded-lg h-9 px-3 bg-[#3d99f5] justify-center`,
                      !canComplete && `opacity-60`
                    )}
                  >
                    <Text style={tw`text-white text-sm font-semibold`}>Complete week</Text>
                  </TouchableOpacity>
                )}

                {/* Status picker */}
                <View style={tw`border border-[#cedbe8] rounded`}>
                  <Picker
                    selectedValue={current}
                    onValueChange={(val) => {
                      const next = val as Status;
                      if (next === 'Completed' && !canComplete) {
                        Alert.alert(
                          'Not ready',
                          'Please watch all required videos (and reading, if any) first.'
                        );
                        return;
                      }
                      setStatus(item.week, next);
                    }}
                    dropdownIconColor="#0d141c"
                    style={tw`h-9 w-44`}
                  >
                    <Picker.Item label="Not Started" value="Not Started" />
                    <Picker.Item label="In Progress" value="In Progress" />
                    <Picker.Item label="Completed" value="Completed" />
                  </Picker>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* Congrats + certificate + review nudge */}
      {allCompleted && (
        <View style={tw`p-4 rounded-xl bg-[#eef7ff]`}>
          <Text style={tw`text-gray-900`}>
            🎉 Nice work! You’ve completed every week. Check your Achievements page for badges.
          </Text>

          <View style={tw`mt-3 flex-row flex-wrap items-center gap-2`}>
            {!!oerMeta ? (
              <>
                <TouchableOpacity
                  onPress={generateFreeOerCertificate}
                  disabled={issuingCert}
                  style={tw.style(
                    `rounded-xl h-10 px-4 bg-emerald-600 justify-center`,
                    issuingCert && `opacity-60`
                  )}
                >
                  <Text style={tw`text-white text-sm font-semibold`}>
                    {issuingCert ? 'Generating…' : 'Generate Free Certificate'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={downloadOerTranscript}
                  disabled={downloadingTranscript || !courseWatchedAll}
                  style={tw.style(
                    `rounded-xl h-10 px-4 bg-indigo-600 justify-center`,
                    (!courseWatchedAll || downloadingTranscript) && `opacity-60`
                  )}
                >
                  <Text style={tw`text-white text-sm font-semibold`}>
                    {downloadingTranscript ? 'Preparing…' : 'Download Transcript (Free)'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <CertificateButton courseId={courseIdS} />
            )}
          </View>

          {!oerMeta && !hasMyReview && (
            <TouchableOpacity
              onPress={() => setOpenReview(true)}
              style={tw`mt-3 rounded-xl h-10 px-4 bg-[#e7edf4] justify-center self-start`}
            >
              <Text style={tw`text-sm font-semibold`}>Rate this course</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Review modal */}
      <Modal
        visible={openReview}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenReview(false)}
      >
        <View style={tw`flex-1 items-center justify-center bg-black/40 px-4`}>
          <View style={tw`w-full max-w-md rounded-2xl bg-white p-4 border border-[#cedbe8]`}>
            <Text style={tw`text-lg font-bold mb-2`}>Rate this course</Text>

            <View style={tw`flex-row items-center gap-2 mb-3`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Text
                    style={tw.style(
                      `text-2xl`,
                      n <= rating ? `text-yellow-500` : `text-gray-400`
                    )}
                  >
                    ★
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Optional comment (max 500 chars)"
              maxLength={500}
              multiline
              style={tw`w-full text-sm rounded-lg p-2 bg-[#e7edf4] min-h-24`}
            />

            <View style={tw`mt-4 flex-row items-center gap-2`}>
              <TouchableOpacity
                disabled={posting || rating < 1}
                onPress={onSubmitReview}
                style={tw.style(
                  `px-4 h-10 rounded-xl bg-[#3d99f5] justify-center`,
                  (posting || rating < 1) && `opacity-60`
                )}
              >
                <Text style={tw`text-white text-sm font-semibold`}>
                  {posting ? 'Saving…' : 'Submit'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setOpenReview(false)}
                style={tw`px-4 h-10 rounded-xl bg-white border border-[#cedbe8] justify-center`}
              >
                <Text style={tw`text-sm font-semibold`}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
