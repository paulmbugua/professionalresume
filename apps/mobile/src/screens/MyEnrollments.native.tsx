// apps/mobile/src/pages/MyEnrollments.native.tsx
import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import tw from '../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import { useEnrollments } from '@mytutorapp/shared/hooks';
import type { Enrollment } from '@mytutorapp/shared/types';
import type { MainStackParamList } from '../navigation/types';

type NormalizedEnrollment = {
  id: string;
  courseId: string;
  title: string;
  description: string;
  level: string;
  startedAt: string | null;
  status: string;
  progress: number;
};

function normalizeEnrollment(row: unknown): NormalizedEnrollment {
  const o = (row ?? {}) as Record<string, unknown>;
  const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
  const num = (v: unknown, fallback = 0): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;

  const id = str(o.id) || String(o.id ?? '');
  const courseId = str(o['courseId']) || str(o['course_id']);
  const title = str(o['title']) || str(o['courseTitle']) || 'Course';
  const description = str(o['description']);
  const level = str(o['level']) || 'All levels';
  const startedAt = str(o['started_at']) || str(o['enrolled_at']) || str(o['startedAt']) || null;
  const status = str(o['status']) || 'active';
  const progress = num(o['progress']);

  return { id, courseId, title, description, level, startedAt, status, progress };
}

const MyEnrollmentsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const { backendUrl, token, profile, role: ctxRole } = useShopContext();

  // Route helpers
  const goHome = () => navigation.navigate('Home');
  const goCourses = () => navigation.navigate('Courses');
  const goCourse = (courseId: string) => navigation.navigate('CourseDetails', { courseId });
  const goLogin = () => navigation.navigate('Login');
  const goCreateCourse = () => navigation.navigate('CreateCourse');

  // Prefer profile.role (source of truth), fallback to ctxRole
  const roleStr = String((profile as any)?.role ?? ctxRole ?? '').toLowerCase();

  // Enrollments hook (always called; we’ll only fetch when confirmed student)
  const { enrollments, loading, error, setError, fetchMine, cancel, setEnrollments } = useEnrollments({
    backendUrl,
    token: token ?? '',
    studentId: 'me', // backend resolves from JWT
  });

  const [deleting, setDeleting] = useState<string | null>(null);

  // Redirect tutors after role is known
  useEffect(() => {
    if (token && roleStr === 'tutor') {
      try {
        goCreateCourse();
      } catch {
        goHome();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, roleStr]);

  // Only fetch enrollments once we know the user is a student
  useEffect(() => {
    if (token && roleStr === 'student') {
      fetchMine().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, roleStr]);

  const handleUnenroll = async (enrollmentId: string) => {
    const ok = await new Promise<boolean>((resolve) => {
      Alert.alert('Unenroll', 'Are you sure you want to leave this course?', [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Unenroll', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
    if (!ok) return;

    setDeleting(enrollmentId);
    try {
      // optimistic UI
      setEnrollments((prev) => prev.filter((e) => String((e as Enrollment).id) !== String(enrollmentId)));
      await cancel(enrollmentId);
    } catch {
      await fetchMine().catch(() => {});
      setError('Failed to unenroll. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  // ── UI gates ───────────────────────────────────────────────────────────────

  // Not logged in
  if (!token) {
    return (
      <SafeAreaView style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <Text style={tw`text-xl font-semibold text-[#0d141c] dark:text-white`}>Please sign in</Text>
          <Text style={tw`text-sm text-[#49739c] dark:text-white/70 mt-2`}>
            You need to be logged in to view your enrollments.
          </Text>
          <Pressable onPress={goLogin} style={tw`mt-4 rounded-xl h-10 px-4 bg-[#3d99f5] items-center justify-center`}>
            <Text style={tw`text-white font-semibold text-sm`}>Go to Login</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Role still unknown (avoid denying too early)
  if (!roleStr) {
    return (
      <SafeAreaView style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <ActivityIndicator />
          <Text style={tw`mt-2 text-sm text-[#49739c] dark:text-white/70`}>Checking your account…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Tutor: we’re navigating away; show a tiny "redirecting" spinner
  if (roleStr === 'tutor') {
    return (
      <SafeAreaView style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <ActivityIndicator />
          <Text style={tw`mt-2 text-sm text-[#49739c] dark:text-white/70`}>Redirecting…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Non-student (and not tutor)
  if (roleStr !== 'student') {
    return (
      <SafeAreaView style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <Text style={tw`text-xl font-semibold text-[#0d141c] dark:text-gray-100`}>Access denied</Text>
          <Text style={tw`text-sm text-[#64748b] dark:text-gray-400 mt-2`}>
            This page is only available to student accounts.
          </Text>
          <Pressable
            onPress={goHome}
            style={tw`mt-4 rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] items-center justify-center`}
          >
            <Text style={tw`text-sm font-semibold text-[#0d141c] dark:text-white`}>Go back home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Student view ───────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
      <ScrollView contentContainerStyle={tw`px-4 py-6`}>
        {/* Header */}
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <Text style={tw`text-[28px] font-extrabold text-[#0d141c] dark:text-white`}>My Enrollments</Text>
          <Pressable onPress={goCourses} style={tw`rounded-xl h-10 px-4 bg-[#3d99f5] items-center justify-center`}>
            <Text style={tw`text-white text-sm font-semibold`}>Explore courses</Text>
          </Pressable>
        </View>

        {/* States */}
        {loading && (
          <View style={tw`flex-row items-center`}>
            <ActivityIndicator />
            <Text style={tw`ml-2 text-sm text-[#49739c] dark:text-white/70`}>Loading your enrollments…</Text>
          </View>
        )}

        {!loading && !!error && (
          <Text style={tw`text-sm text-red-600 dark:text-red-400`}>{String(error)}</Text>
        )}

        {!loading && !error && enrollments.length === 0 && (
          <View style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}>
            <Text style={tw`text-base text-[#0d141c] dark:text-white`}>You have no enrollments yet.</Text>
            <Text style={tw`text-sm text-[#49739c] dark:text-white/70 mt-1`}>
              Browse the catalog to get started.
            </Text>
            <Pressable
              onPress={goCourses}
              style={tw`mt-4 rounded-xl h-10 px-4 bg-[#e7edf4] dark:bg-[#172534] items-center justify-center`}
            >
              <Text style={tw`text-sm font-semibold text-[#0d141c] dark:text-white`}>Go to Catalog</Text>
            </Pressable>
          </View>
        )}

        {/* List */}
        {!loading && !error && enrollments.length > 0 && (
          <View style={tw`flex flex-col gap-4`}>
            {enrollments.map((row) => {
              const n = normalizeEnrollment(row);
              const pct = Math.max(0, Math.min(100, Number(n.progress ?? 0)));

              return (
                <View
                  key={n.id}
                  style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}
                >
                  <View style={tw`flex-row items-start justify-between`}>
                    <View style={tw`flex-1 pr-3`}>
                      <Text numberOfLines={1} style={tw`text-base font-semibold text-[#0d141c] dark:text-white`}>
                        {n.title}
                      </Text>
                      {!!n.description && (
                        <Text numberOfLines={2} style={tw`text-sm text-[#49739c] dark:text-white/70 mt-0.5`}>
                          {n.description}
                        </Text>
                      )}
                    </View>
                    <View style={tw`px-2 py-1 rounded-lg bg-[#e7edf4] dark:bg-[#172534]`}>
                      <Text style={tw`text-xs text-[#0d141c] dark:text-white`}>{n.status}</Text>
                    </View>
                  </View>

                  {/* Progress */}
                  <View style={tw`flex-row items-center gap-3 mt-3`}>
                    <View style={tw`flex-1 h-1.5 rounded bg-[#cedbe8] dark:bg-white/10 overflow-hidden`}>
                      <View style={[tw`h-1.5 rounded bg-[#3d99f5]` as any, { width: `${pct}%` }]} />
                    </View>
                    <Text style={tw`text-xs font-medium text-[#0d141c] dark:text-white`}>{pct}%</Text>
                  </View>

                  <Text style={tw`text-xs text-[#49739c] dark:text-white/70 mt-2`}>
                    {n.startedAt ? `Started: ${new Date(n.startedAt).toLocaleDateString()}` : '—'}
                  </Text>

                  {/* Actions */}
                  <View style={tw`flex-row items-center gap-2 mt-3`}>
                    <Pressable
                      onPress={() => goCourse(n.courseId)}
                      style={tw`rounded-xl h-9 px-3 bg-[#e7edf4] dark:bg-[#172534] items-center justify-center`}
                    >
                      <Text style={tw`text-sm font-semibold text-[#0d141c] dark:text-white`}>View course</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleUnenroll(String(n.id))}
                      disabled={deleting === String(n.id)}
                      style={tw`rounded-xl h-9 px-3 items-center justify-center ${deleting === String(n.id) ? 'opacity-60' : ''} bg-red-50 dark:bg-[#2a0d11]`}
                    >
                      <Text style={tw`text-sm font-semibold text-red-600 dark:text-red-400`}>
                        {deleting === String(n.id) ? 'Removing…' : 'Unenroll'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MyEnrollmentsScreen;
