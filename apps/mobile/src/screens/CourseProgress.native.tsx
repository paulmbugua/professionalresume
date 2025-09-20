/* eslint-disable prettier/prettier */
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, TextInput, LayoutChangeEvent } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import debounce from 'lodash.debounce';
import tw from '../../tailwind';

import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses } from '@mytutorapp/shared/hooks';
import { useCourseProgress } from '@mytutorapp/shared/hooks/useCourseProgress';
import { useCourseReviews } from '@mytutorapp/shared/hooks/useCourseReviews';

import CertificateButton from './CertificateButton.native';
import CourseReadingPanel from './CourseReadingPanel.native';

import type {
  Course as CourseType,
  CourseProgress as CourseProgressItem,
  UpdateProgressPayload,
  SyllabusItem,
} from '@mytutorapp/shared/types';

type Status = 'Not Started' | 'In Progress' | 'Completed';

export default function CourseProgress() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const courseId: string | undefined = route?.params?.courseId ?? route?.params?.id;
  const courseIdS: string = courseId ?? '';

  const { backendUrl, token, profile } = useShopContext();
  const myId = String(profile?.id ?? '');

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

  // ✅ Guard week possibly undefined
  const progressByWeek = useMemo(() => {
    const map = new Map<number, Status>();
    (progress as CourseProgressItem[]).forEach((p) => {
      if (typeof p?.week === 'number') {
        map.set(p.week, (p.status as Status) ?? 'Not Started');
      }
    });
    return map;
  }, [progress]);

  const counts = useMemo(() => {
    let notStarted = 0, inProgress = 0, completed = 0;
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
    const inProg = syllabus.find((w) => (progressByWeek.get(w.week) ?? 'Not Started') === 'In Progress');
    if (inProg) return inProg.week;
    const notSt = syllabus.find((w) => (progressByWeek.get(w.week) ?? 'Not Started') === 'Not Started');
    if (notSt) return notSt.week;
    return syllabus.length ? syllabus[syllabus.length - 1]?.week : undefined;
  }, [syllabus, progressByWeek]);

  const [activeWeek, setActiveWeek] = useState<number | null>(null);
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={tw`rounded-xl h-10 px-4 bg-gray-100 justify-center`}>
            <Text style={tw`text-sm font-semibold`}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // From here, selectedCourse is definitely present
  const course = selectedCourse as CourseType;

  if (syllabus.length === 0) {
    return (
      <View style={tw`max-w-xl mx-auto p-6`}>
        <Text style={tw`text-2xl font-bold`}>{course.title ?? 'Course'}</Text>
        <Text style={tw`text-gray-600`}>This course doesn’t have a syllabus yet.</Text>
        <View style={tw`mt-4`}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={tw`rounded-xl h-10 px-4 bg-gray-100 justify-center`}>
            <Text style={tw`text-sm font-semibold`}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ✅ Guard update possibly undefined
  const setStatus = async (week: number, status: Status) => {
    const payload: UpdateProgressPayload = { courseId: courseIdS, week, status };
    try {
      await update?.(payload);
      if (status === 'Completed') debouncedPrompt();
    } catch {}
  };

  const startCourse = async () => {
    if (!syllabus.length) return;
    const firstItem = syllabus[0];
      if (!firstItem) return;             // or handle the empty case however you prefer
      const first = firstItem.week;

    const st = (progressByWeek.get(first) ?? 'Not Started') as Status;
    if (st === 'Not Started') await setStatus(first, 'In Progress');
    setActiveWeek(first);
  };

  const continueCourse = async () => {
    if (suggestedWeek == null) return; // guard
    const st = (progressByWeek.get(suggestedWeek) ?? 'Not Started') as Status;
    if (st === 'Not Started') await setStatus(suggestedWeek, 'In Progress');
    setActiveWeek(suggestedWeek);
  };

  const completeCurrent = async () => {
    if (suggestedWeek == null) return; // guard
    await setStatus(suggestedWeek, 'Completed');
  };

  const allCompleted = counts.total > 0 && counts.completed === counts.total;

  // ✅ Defensive prev/next indexing
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

  const activeItem = activeWeek == null ? null : (syllabus.find((w) => w.week === activeWeek) ?? null);
  const activeStatus: Status = activeWeek == null ? 'Not Started' : (progressByWeek.get(activeWeek) ?? 'Not Started');

  return (
    <ScrollView ref={scrollRef} contentContainerStyle={tw`max-w-3xl w-full self-center px-4 py-8 gap-y-10`}>
      {/* Header */}
      <View style={tw`gap-y-2`}>
        <Text style={tw`text-2xl font-bold`}>{course.title ?? 'Course'}</Text>
        {!!course.description && (
          <Text style={tw`text-gray-600`}>{course.description}</Text>
        )}

        {/* Overall progress */}
        <View style={tw`mt-2`}>
          <View style={tw`flex-row items-center justify-between`}>
            <Text style={tw`text-sm text-gray-600`}>Overall progress</Text>
            <Text style={tw`text-sm text-gray-600`}>{counts.pct}% ({counts.completed}/{counts.total})</Text>
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
            <TouchableOpacity onPress={startCourse} style={tw`rounded-xl h-10 px-4 bg-[#3d99f5] justify-center`}>
              <Text style={tw`text-white text-sm font-semibold`}>Start course</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={continueCourse} style={tw`rounded-xl h-10 px-4 bg-[#3d99f5] justify-center`}>
              <Text style={tw`text-white text-sm font-semibold`}>Continue where I left off</Text>
            </TouchableOpacity>
          )}

          {(counts.inProgress + counts.notStarted > 0) && (
            <TouchableOpacity onPress={completeCurrent} style={tw`rounded-xl h-10 px-4 bg-white border border-[#cedbe8] justify-center`}>
              <Text style={tw`text-sm font-semibold`}>Mark current week completed</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => navigation.goBack()} style={tw`rounded-xl h-10 px-4 bg-white border border-[#cedbe8] justify-center`}>
            <Text style={tw`text-sm font-semibold`}>Back</Text>
          </TouchableOpacity>

          {allCompleted && !hasMyReview && (
            <TouchableOpacity onPress={() => setOpenReview(true)} style={tw`rounded-xl h-10 px-4 bg-[#e7edf4] justify-center`}>
              <Text style={tw`text-sm font-semibold`}>Rate this course</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Reading Mode */}
      {activeWeek != null && (
        <View style={tw`gap-y-4`}>
          {activeItem ? (() => {
            const aw = activeWeek as number;
            const ai = activeItem as SyllabusItem;
            const atEnd = syllabus.findIndex((w) => w.week === aw) === syllabus.length - 1;
            const atStart = syllabus.findIndex((w) => w.week === aw) === 0;

            return (
              <>
                <CourseReadingPanel
                  courseId={courseIdS}
                  week={aw}
                  item={ai}
                  status={activeStatus}
                  onSetStatus={(next: Status) => setStatus(aw, next)}
                />

                <View style={tw`flex-row flex-wrap items-center gap-2`}>
                  <TouchableOpacity
                    onPress={goPrev}
                    disabled={atStart}
                    style={tw.style(
                      `rounded-xl h-10 px-4 justify-center`,
                      atStart ? `bg-gray-200` : `bg-white border border-[#cedbe8]`
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
                    disabled={atEnd}
                    style={tw.style(
                      `rounded-xl h-10 px-4 justify-center`,
                      atEnd ? `bg-gray-200` : `bg-white border border-[#cedbe8]`
                    )}
                  >
                    <Text style={tw`text-sm font-semibold`}>Next week →</Text>
                  </TouchableOpacity>
                </View>
              </>
            );
          })() : (
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
                  Status: {current}{isSuggested ? ' • current' : ''}
                </Text>
              </View>

              <View style={tw`flex-row items-center gap-2`}>
                {current === 'Not Started' && (
                  <TouchableOpacity onPress={quickStart} style={tw`rounded-lg h-9 px-3 bg-[#e7edf4] justify-center`}>
                    <Text style={tw`text-sm font-semibold`}>Start week</Text>
                  </TouchableOpacity>
                )}

                {current !== 'Completed' && (
                  <TouchableOpacity
                    onPress={() => setStatus(item.week, 'Completed')}
                    style={tw`rounded-lg h-9 px-3 bg-[#3d99f5] justify-center`}
                  >
                    <Text style={tw`text-white text-sm font-semibold`}>Complete week</Text>
                  </TouchableOpacity>
                )}

                {/* Status picker */}
                <View style={tw`border border-[#cedbe8] rounded`}>
                  <Picker
                    selectedValue={current}
                    onValueChange={(val) => setStatus(item.week, val as Status)}
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

          <View style={tw`mt-3`}>
            <CertificateButton courseId={courseIdS} />
          </View>

          {!hasMyReview && (
            <TouchableOpacity onPress={() => setOpenReview(true)} style={tw`mt-3 rounded-xl h-10 px-4 bg-[#e7edf4] justify-center self-start`}>
              <Text style={tw`text-sm font-semibold`}>Rate this course</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Review modal */}
      <Modal visible={openReview} transparent animationType="fade" onRequestClose={() => setOpenReview(false)}>
        <View style={tw`flex-1 items-center justify-center bg-black/40 px-4`}>
          <View style={tw`w-full max-w-md rounded-2xl bg-white p-4 border border-[#cedbe8]`}>
            <Text style={tw`text-lg font-bold mb-2`}>Rate this course</Text>

            <View style={tw`flex-row items-center gap-2 mb-3`}>
              {[1,2,3,4,5].map(n => (
                <TouchableOpacity key={n} onPress={() => setRating(n)}>
                  <Text style={tw.style(`text-2xl`, n <= rating ? `text-yellow-500` : `text-gray-400`)}>★</Text>
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
                <Text style={tw`text-white text-sm font-semibold`}>{posting ? 'Saving…' : 'Submit'}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setOpenReview(false)} style={tw`px-4 h-10 rounded-xl bg-white border border-[#cedbe8] justify-center`}>
                <Text style={tw`text-sm font-semibold`}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
 