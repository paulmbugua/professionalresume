/* eslint-disable prettier/prettier */
/* eslint-disable react-hooks/exhaustive-deps */

import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import tw from '../../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import { useOrg } from '@mytutorapp/shared/hooks/useOrg';

import ThemeToggle from '../ThemeToggle.native';
import { useThemePref } from '../../theme/ThemeContext';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type OrgLearnerHomeParams = {
  assignmentId?: string | number;
  courseId?: string | number;
  qt?: 'mcq' | 'short';
  qs?: string | number;

  // Optional deep-link hints (from web-style returnTo or QR)
  studentId?: string | number;
  subject?: string;
  subjectKey?: string;
  subject_key?: string;
};

type ParamList = {
  OrgLearnerHome: OrgLearnerHomeParams | undefined;
};

/* ------------------------------------------------------------------ */
/* Theming helper (same style as OrgProfileNative)                    */
/* ------------------------------------------------------------------ */

function usePalette() {
  const { resolvedScheme } = useThemePref();
  const isDark = resolvedScheme === 'dark';
  return {
    isDark,
    bg: isDark ? '#020617' : '#f8fafc',
    card: isDark ? '#0b1016' : '#ffffff',
    softCard: isDark ? '#050816' : '#ffffff',
    border: isDark ? 'rgba(148,163,184,0.28)' : '#cedbe8',
    divider: isDark ? 'rgba(15,23,42,1)' : '#e7edf4',
    text: isDark ? '#e5f0ff' : '#0d141c',
    textMuted: isDark ? 'rgba(148,163,184,0.95)' : '#49739c',
    textSubtle: isDark ? 'rgba(148,163,184,0.85)' : 'rgba(73,115,156,0.75)',
    chipBg: (_c: string) => (isDark ? `${_c}24` : '#e7edf4'),
    chipDot: (c: string) => c,
    surface(style?: any) {
      return [
        tw`rounded-3xl p-4`,
        {
          backgroundColor: this.card,
          borderColor: this.border,
          borderWidth: 1,
        },
        style,
      ];
    },
    smallSurface(style?: any) {
      return [
        tw`rounded-2xl p-3`,
        {
          backgroundColor: this.card,
          borderColor: this.border,
          borderWidth: 1,
        },
        style,
      ];
    },
    softSurface(style?: any) {
      return [
        tw`rounded-3xl p-4`,
        {
          backgroundColor: this.softCard,
          borderColor: this.border,
          borderWidth: 1,
        },
        style,
      ];
    },
  };
}

/* Simple press scale feedback – reused for CTAs */
const usePressScale = () => {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: s.value }],
  }));
  const onIn = () => {
    s.value = withSpring(0.97, { damping: 20, stiffness: 260 });
  };
  const onOut = () => {
    s.value = withSpring(1, { damping: 16, stiffness: 200 });
  };
  return { style, onIn, onOut };
};

/* ------------------------------------------------------------------ */
/* Screen                                                             */
/* ------------------------------------------------------------------ */

const OrgLearnerHomeNative: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ParamList, 'OrgLearnerHome'>>();
  const params = (route.params ?? {}) as OrgLearnerHomeParams;

  const palette = usePalette();
  const insets = useSafeAreaInsets();

  // Shop + Org context (mirror web learner home behaviour)
  const {
    orgToken,
    orgLearner: ctxOrgLearner,
    orgUser: ctxOrgUser,
    user: shopUser,
    userId: ctxUserId,
    orgLogout,
  } = useShopContext() as any;

  const {
    org,
    role,
    currentUser,
    loading: orgLoading,
  } = (useOrg?.() ?? {}) as any;

  const autoRanRef = useRef(false);

  const hasAssignment = !!params.assignmentId;

  // 🔐 If no orgToken, push through org login flow (like existing native logic)
  useEffect(() => {
    if (!orgToken) {
      navigation.replace('InstitutionLogin', { next: 'OrgLearnerHome' });
    }
  }, [orgToken, navigation]);

  // 🤖 Auto-redirect to RobotTutor if we arrive with assignment params
  useEffect(() => {
    if (!orgToken) return;
    if (orgLoading) return;
    if (autoRanRef.current) return;
    if (hasAssignment) {
      autoRanRef.current = true;
      navigation.replace('RobotTutor', {
        assignmentId: String(params.assignmentId),
        ...(params.courseId ? { courseId: String(params.courseId) } : {}),
        flow: 'org',
        lock: '1',
        ...(params.qt ? { qt: params.qt } : {}),
        ...(params.qs ? { qs: String(params.qs) } : {}),
      });
    }
  }, [orgToken, orgLoading, hasAssignment, params, navigation]);

  /* ------------------------------------------------------------------ */
  /* Learner identity + derived fields (copy of web logic)              */
  /* ------------------------------------------------------------------ */

  const rawStudentIdParam = useMemo(
    () =>
      params.studentId != null && String(params.studentId).trim() !== ''
        ? String(params.studentId).trim()
        : '',
    [params.studentId],
  );

  const subjectParam = useMemo(
    () =>
      (params.subject ||
        params.subjectKey ||
        params.subject_key ||
        '') ?? '',
    [params.subject, params.subjectKey, params.subject_key],
  );

  const orgName: string =
    org?.name || org?.org_name || 'Your Institution';

  const planLabel: string = org?.tier
    ? String(org.tier).toUpperCase()
    : 'STARTER';

  const portalLabel: string = role
    ? `${String(role).toUpperCase()} PORTAL`
    : 'LEARNER PORTAL';

  // Candidate learner profiles from Org + Shop context
  const learnerProfileFromOrg =
    (currentUser as any)?.org_learner_profile ||
    (currentUser as any)?.orgLearnerProfile ||
    (currentUser as any)?.org_learner_profiles?.[0] ||
    null;

  const learnerProfileFromShop =
    (shopUser as any)?.org_learner_profile ||
    (shopUser as any)?.orgLearnerProfile ||
    (shopUser as any)?.org_learner_profiles?.[0] ||
    null;

  // ✅ Canonical learner object (same precedence as web)
  const learner: any =
    learnerProfileFromOrg ||
    learnerProfileFromShop ||
    ctxOrgLearner ||
    ctxOrgUser ||
    shopUser ||
    currentUser ||
    null;

  // Canonical learner user id (exam sheets use this as student_user_id)
  const learnerUserId: number | string | null =
    learner?.user_id ??
    learner?.student_user_id ??
    learner?.userId ?? // from { success, userId, ... }
    learner?.id ??
    ctxUserId ??
    (shopUser?.id ?? shopUser?.user_id ?? shopUser?.userId) ??
    null;

  // ✅ Learner studentId used for exams + filters
  const learnerStudentId: string =
    rawStudentIdParam && rawStudentIdParam.trim() !== ''
      ? rawStudentIdParam.trim()
      : learnerUserId != null
      ? String(learnerUserId)
      : '';

  const isLoadingLearner = !learner && !rawStudentIdParam;
  const isBootingOrg = !orgToken || orgLoading;
  const isLoading = isBootingOrg || isLoadingLearner;

  // Derived display fields
  const learnerName: string =
    learner?.name ||
    learner?.full_name ||
    learner?.fullName ||
    learner?.email ||
    'Learner';

  const learnerEmail: string =
    learner?.email ||
    learner?.email_address ||
    learner?.guardian_email ||
    '';

  const learnerGrade: string | null =
    learner?.class_label ||
    learner?.classLabel ||
    learner?.grade ||
    null;

  const learnerSubject: string | null =
    (subjectParam && subjectParam.trim() !== ''
      ? subjectParam.trim()
      : null) ||
    learner?.subject ||
    learner?.subject_name ||
    learner?.subject_label ||
    null;

  const admissionCode: string | null =
    learner?.admission_code ||
    learner?.admissionCode ||
    null;

  const learnerPhotoFromProfile: string | null =
    (learnerProfileFromOrg &&
      (learnerProfileFromOrg.photo_url ||
        learnerProfileFromOrg.photoUrl)) ||
    (learnerProfileFromShop &&
      (learnerProfileFromShop.photo_url ||
        learnerProfileFromShop.photoUrl)) ||
    null;

  const learnerPhoto: string | null =
    learnerPhotoFromProfile ||
    learner?.photo_url ||
    learner?.photoUrl ||
    null;

  const learnerInitial = (learnerName || 'L').trim().charAt(0).toUpperCase();

  // Exams learner view (legacy exam workspace + PDFs)
  const examsParams = {
    view: 'learner' as const,
    ...(learnerStudentId ? { studentId: learnerStudentId } : {}),
  };

  // Course library – learner-aware filters
  const courseNavParams: any = {
    view: 'learner',
  };
  if (learnerStudentId) courseNavParams.studentId = learnerStudentId;
  if (learnerGrade) courseNavParams.class = learnerGrade;
  if (learnerSubject) courseNavParams.subject = learnerSubject;

  // Assignments – learner restricted view (Teach with AI + legacy)
  const assignNavParams: any = {
    view: 'learner',
    tab: 'assign',
  };
  if (learnerStudentId) assignNavParams.studentId = learnerStudentId;
  if (learnerGrade) assignNavParams.class = learnerGrade;
  if (learnerSubject) assignNavParams.subject = learnerSubject;

  // Robot Tutor results & certificates (AI + legacy)
  const resultsNavParams: any = {};
  if (learnerStudentId) resultsNavParams.studentId = learnerStudentId;

  // Logs (dev parity with web)
  useEffect(() => {
    console.log('[OrgLearnerHomeNative] learner ids', {
      rawStudentIdParam,
      learnerUserId,
      learnerStudentId,
      hasProfile: !!learner,
      learner,
      orgCurrentUser: currentUser,
      shopUser,
      ctxOrgLearner,
      ctxOrgUser,
      ctxUserId: ctxUserId ?? null,
    });
  }, [
    rawStudentIdParam,
    learnerUserId,
    learnerStudentId,
    learner,
    currentUser,
    shopUser,
    ctxOrgLearner,
    ctxOrgUser,
    ctxUserId,
  ]);

  useEffect(() => {
    console.log('[OrgLearnerHomeNative] navigation + filters', {
      learnerStudentId,
      learnerUserId,
      learnerGrade,
      learnerSubject,
      examsParams,
      courseNavParams,
      assignNavParams,
      resultsNavParams,
    });
  }, [
    learnerStudentId,
    learnerUserId,
    learnerGrade,
    learnerSubject,
    examsParams,
    courseNavParams,
    assignNavParams,
    resultsNavParams,
  ]);

  /* ------------------------------------------------------------------ */
  /* Actions                                                            */
  /* ------------------------------------------------------------------ */

  const handleLogout = useCallback(async () => {
    if (orgLogout) {
      await orgLogout();
    }
    navigation.replace('InstitutionLogin', { logoutOrg: true });
  }, [orgLogout, navigation]);

  const bottomPad = Math.max(24, insets.bottom + 24);

  const logoutBtn = usePressScale();
  const robotBtn = usePressScale();

  /* ------------------------------------------------------------------ */
  /* Loading shell                                                      */
  /* ------------------------------------------------------------------ */

  if (isLoading) {
    return (
      <SafeAreaView
        style={[tw`flex-1`, { backgroundColor: palette.bg }]}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <View style={tw`px-4 pt-3 pb-1 flex-row justify-end`}>
          <ThemeToggle />
        </View>
        <View style={tw`flex-1 items-center justify-center px-6`}>
          <View style={palette.softSurface(tw`w-full max-w-xs`)}>
            <Text
              style={[
                tw`text-[10px] uppercase tracking-[1.6px]`,
                { color: palette.textSubtle },
              ]}
            >
              {portalLabel}
            </Text>
            <Text
              style={[
                tw`mt-2 text-lg font-semibold`,
                { color: palette.text },
              ]}
            >
              Preparing your learner dashboard…
            </Text>
            <Text
              style={[
                tw`mt-2 text-xs`,
                { color: palette.textMuted },
              ]}
            >
              Please wait a moment while we load your institution profile and
              learner account.
            </Text>

            <View style={tw`mt-4 flex-row items-center`}>
              <ActivityIndicator />
              <Text
                style={[
                  tw`ml-2 text-[11px]`,
                  { color: palette.textSubtle },
                ]}
              >
                Loading…
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ------------------------------------------------------------------ */
  /* Main render                                                        */
  /* ------------------------------------------------------------------ */

  return (
    <SafeAreaView
      style={[tw`flex-1`, { backgroundColor: palette.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Animated.ScrollView
        entering={FadeIn.duration(220)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[tw`pb-0`, { paddingBottom: bottomPad }]}
      >
        {/* Top bar (Theme toggle) */}
        <View style={tw`px-4 pt-3 pb-1 flex-row justify-end`}>
          <ThemeToggle />
        </View>

        <View style={tw`px-4`}>
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(320)}
            style={palette.surface()}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1 min-w-0`}>
                <Text
                  style={[
                    tw`text-[10px] uppercase tracking-[1.6px]`,
                    { color: palette.textSubtle },
                  ]}
                  numberOfLines={1}
                >
                  {portalLabel}
                </Text>
                <Text
                  style={[
                    tw`mt-0.5 text-xl font-bold`,
                    { color: palette.text },
                  ]}
                  numberOfLines={1}
                >
                  {orgName}
                </Text>
                <Text
                  style={[
                    tw`mt-0.5 text-[11px]`,
                    { color: palette.textMuted },
                  ]}
                >
                  {planLabel} plan
                </Text>
              </View>

              {/* Compact logout */}
              <Animated.View style={[logoutBtn.style, tw`ml-3`]}>
                <TouchableOpacity
                  onPress={handleLogout}
                  onPressIn={logoutBtn.onIn}
                  onPressOut={logoutBtn.onOut}
                  accessibilityRole="button"
                  accessibilityLabel="Sign out from this learner portal"
                  style={[
                    tw`px-3 py-1.5 rounded-full flex-row items-center justify-center`,
                    { backgroundColor: palette.divider },
                  ]}
                >
                  <Ionicons
                    name="log-out-outline"
                    size={14}
                    color={palette.text}
                  />
                  <Text
                    style={[
                      tw`ml-1 text-[11px] font-medium`,
                      { color: palette.text },
                    ]}
                  >
                    Not you?{' '}
                    <Text style={tw`font-semibold`}>Sign out</Text>
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>

          {/* Learner identity card */}
          <Animated.View
            entering={FadeInDown.delay(60).duration(340)}
            style={[palette.surface(), tw`mt-4`]}
          >
            <View style={tw`flex-row items-center gap-3`}>
              {/* Avatar */}
              <View
                style={[
                  tw`h-12 w-12 rounded-full items-center justify-center overflow-hidden`,
                  {
                    backgroundColor: palette.divider,
                  },
                ]}
              >
                {learnerPhoto ? (
                  <Image
                    source={{ uri: learnerPhoto }}
                    style={tw`h-full w-full`}
                    contentFit="cover"
                    transition={220}
                  />
                ) : (
                  <Text
                    style={[
                      tw`text-lg font-bold`,
                      { color: palette.text },
                    ]}
                  >
                    {learnerInitial}
                  </Text>
                )}
              </View>

              {/* Identity */}
              <View style={tw`flex-1 min-w-0`}>
                <Text
                  style={[
                    tw`text-[10px] uppercase tracking-[1.6px]`,
                    { color: palette.textSubtle },
                  ]}
                >
                  Signed in learner
                </Text>

                <View style={tw`mt-0.5 flex-row flex-wrap items-center gap-2`}>
                  <Text
                    style={[
                      tw`text-base font-semibold`,
                      { color: palette.text },
                    ]}
                    numberOfLines={1}
                  >
                    {learnerName}
                  </Text>

                  {learnerGrade && (
                    <View
                      style={[
                        tw`px-2 py-0.5 rounded-full`,
                        { backgroundColor: '#22c55e1f' },
                      ]}
                    >
                      <Text
                        style={[
                          tw`text-[10px] font-medium`,
                          { color: '#bbf7d0' },
                        ]}
                      >
                        Grade / Class: {learnerGrade}
                      </Text>
                    </View>
                  )}

                  {learnerSubject && (
                    <View
                      style={[
                        tw`px-2 py-0.5 rounded-full`,
                        { backgroundColor: '#0ea5e91f' },
                      ]}
                    >
                      <Text
                        style={[
                          tw`text-[10px] font-medium`,
                          { color: '#bae6fd' },
                        ]}
                      >
                        Subject focus: {learnerSubject}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={tw`mt-2`}>
                  <View style={tw`flex-row flex-wrap items-baseline gap-1`}>
                    <Text
                      style={[
                        tw`text-[11px]`,
                        { color: palette.textSubtle },
                      ]}
                    >
                      📧 Email:
                    </Text>
                    <Text
                      style={[
                        tw`text-[11px] font-mono`,
                        { color: palette.text },
                      ]}
                    >
                      {learnerEmail ||
                        'No email on file yet – ask your teacher to update it.'}
                    </Text>
                  </View>

                  {admissionCode && (
                    <View
                      style={tw`mt-1 flex-row flex-wrap items-baseline gap-1`}
                    >
                      <Text
                        style={[
                          tw`text-[11px]`,
                          { color: palette.textSubtle },
                        ]}
                      >
                        🆔 Admission No:
                      </Text>
                      <Text
                        style={[
                          tw`text-[11px] font-mono`,
                          { color: palette.text },
                        ]}
                      >
                        {admissionCode}
                      </Text>
                    </View>
                  )}

                  <Text
                    style={[
                      tw`mt-2 text-[10px]`,
                      { color: palette.textSubtle },
                    ]}
                  >
                    If this name or grade doesn&apos;t look correct, sign out
                    and ask your teacher to confirm your login card.
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Start learning / Robot Tutor */}
          <Animated.View
            entering={FadeInDown.delay(110).duration(340)}
            style={[palette.softSurface(), tw`mt-4`]}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1 mr-3`}>
                <Text
                  style={[
                    tw`text-base font-semibold`,
                    { color: palette.text },
                  ]}
                >
                  Start learning
                </Text>
                <Text
                  style={[
                    tw`mt-1 text-xs`,
                    { color: palette.textMuted },
                  ]}
                >
                  Jump into the Robot Tutor to study any topic or continue where
                  you left off. If you joined via an invite, we’ll take you
                  straight into your assignment.
                </Text>
              </View>

              <Animated.View style={robotBtn.style}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('RobotTutor', {
                      flow: 'org',
                      lock: '1',
                      ...(params.assignmentId
                        ? { assignmentId: String(params.assignmentId) }
                        : {}),
                      ...(params.courseId
                        ? { courseId: String(params.courseId) }
                        : {}),
                      ...(params.qt ? { qt: params.qt } : {}),
                      ...(params.qs ? { qs: String(params.qs) } : {}),
                    })
                  }
                  onPressIn={robotBtn.onIn}
                  onPressOut={robotBtn.onOut}
                  accessibilityRole="button"
                  accessibilityLabel="Open Robot Tutor"
                  style={tw`h-10 px-4 rounded-2xl bg-emerald-600 flex-row items-center justify-center`}
                >
                  <Ionicons name="sparkles-outline" size={16} color="#fff" />
                  <Text
                    style={tw`ml-2 text-[11px] font-semibold text-white`}
                  >
                    Open Robot Tutor
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Animated.View>

          {/* Exam results & report cards (legacy exams) */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(340)}
            style={[palette.surface(), tw`mt-4`]}
          >
            <View style={tw`flex-row items-center justify-between gap-3`}>
              <View style={tw`flex-1`}>
                <Text
                  style={[
                    tw`text-base font-semibold`,
                    { color: palette.text },
                  ]}
                >
                  Exam results &amp; report cards
                </Text>
                <Text
                  style={[
                    tw`mt-1 text-xs`,
                    { color: palette.textMuted },
                  ]}
                >
                  View your official institution exam marks and download report
                  cards as PDF for each term or exam session.
                </Text>
              </View>

            {/* learner view inside org exams workspace */}
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('OrgElearnPortal', {
                    tab: 'exams',
                    ...examsParams,
                    from: 'learner',
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Open my exam results"
                style={tw`h-10 px-4 rounded-2xl bg-sky-600 flex-row items-center justify-center`}
              >
                <Text
                  style={tw`text-sm font-semibold text-white`}
                >
                  📄 Open my results
                </Text>
              </TouchableOpacity>
            </View>

            <Text
              style={[
                tw`mt-2 text-[11px]`,
                { color: palette.textSubtle },
              ]}
            >
              Results are powered by your institution&apos;s DayBreak exams
              workspace. You can save or print the downloaded report cards.
            </Text>
          </Animated.View>

          {/* Learning tools grid */}
          <Animated.View
            entering={FadeInDown.delay(190).duration(340)}
            style={[palette.surface(), tw`mt-4`]}
          >
            <Text
              style={[
                tw`text-base font-semibold mb-2`,
                { color: palette.text },
              ]}
            >
              Learning tools
            </Text>

            <View style={tw`gap-3`}>
              {/* Assignments – learner restricted view */}
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('OrgElearnPortal', {
                    ...assignNavParams,
                    from: 'learner',
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Open assignments"
                style={[
                  palette.smallSurface(),
                  tw`flex-row items-start justify-between`,
                ]}
              >
                <View style={tw`flex-1 mr-2`}>
                  <View
                    style={tw`flex-row items-center justify-between gap-2`}
                  >
                    <Text
                      style={[
                        tw`text-sm font-semibold`,
                        { color: palette.text },
                      ]}
                    >
                      Assignments (files &amp; AI)
                    </Text>
                    <Text
                      style={[
                        tw`text-[11px]`,
                        { color: '#a5b4fc' },
                      ]}
                    >
                      Open →
                    </Text>
                  </View>
                  <Text
                    style={[
                      tw`mt-1 text-xs`,
                      { color: palette.textMuted },
                    ]}
                  >
                    See only assignments that your teachers have shared with
                    you – including Teach with AI links and legacy file-based
                    tasks.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Results & certificates (Robot Tutor + legacy overview) */}
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Results', resultsNavParams)
                }
                accessibilityRole="button"
                accessibilityLabel="Open results and certificates"
                style={[
                  palette.smallSurface(),
                  tw`flex-row items-start justify-between`,
                ]}
              >
                <View style={tw`flex-1 mr-2`}>
                  <View
                    style={tw`flex-row items-center justify-between gap-2`}
                  >
                    <Text
                      style={[
                        tw`text-sm font-semibold`,
                        { color: palette.text },
                      ]}
                    >
                      Results &amp; certificates
                    </Text>
                    <Text
                      style={[
                        tw`text-[11px]`,
                        { color: '#a5b4fc' },
                      ]}
                    >
                      View →
                    </Text>
                  </View>
                  <Text
                    style={[
                      tw`mt-1 text-xs`,
                      { color: palette.textMuted },
                    ]}
                  >
                    Check your quiz results from Robot Tutor and legacy exams.
                    Certificates are currently available for Robot Tutor quizzes
                    only.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Course library – learner aware */}
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Courses', courseNavParams)
                }
                accessibilityRole="button"
                accessibilityLabel="Open course library"
                style={[
                  palette.smallSurface(),
                  tw`flex-row items-start justify-between`,
                ]}
              >
                <View style={tw`flex-1 mr-2`}>
                  <View
                    style={tw`flex-row items-center justify-between gap-2`}
                  >
                    <Text
                      style={[
                        tw`text-sm font-semibold`,
                        { color: palette.text },
                      ]}
                    >
                      Course library
                    </Text>
                    <Text
                      style={[
                        tw`text-[11px]`,
                        { color: '#a5b4fc' },
                      ]}
                    >
                      Browse →
                    </Text>
                  </View>
                  <Text
                    style={[
                      tw`mt-1 text-xs`,
                      { color: palette.textMuted },
                    ]}
                  >
                    Explore courses, OER resources, and AI lessons connected to
                    your account, class
                    {learnerGrade ? ` (${learnerGrade})` : ''} and
                    {learnerSubject
                      ? ` subject (${learnerSubject}).`
                      : ' subjects.'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Messages & help */}
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Messages', {
                    studentId: learnerStudentId || undefined,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Open messages and help"
                style={[
                  palette.smallSurface(),
                  tw`flex-row items-start justify-between`,
                ]}
              >
                <View style={tw`flex-1 mr-2`}>
                  <View
                    style={tw`flex-row items-center justify-between gap-2`}
                  >
                    <Text
                      style={[
                        tw`text-sm font-semibold`,
                        { color: palette.text },
                      ]}
                    >
                      Messages &amp; help
                    </Text>
                    <Text
                      style={[
                        tw`text-[11px]`,
                        { color: '#a5b4fc' },
                      ]}
                    >
                      Open →
                    </Text>
                  </View>
                  <Text
                    style={[
                      tw`mt-1 text-xs`,
                      { color: palette.textMuted },
                    ]}
                  >
                    Reach your instructors or support and keep all school
                    communication in one place.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Helpful quick chips */}
          <Animated.View
            entering={FadeInDown.delay(230).duration(340)}
            style={[palette.surface(), tw`mt-4 mb-6`]}
          >
            <Text
              style={[
                tw`text-base font-semibold mb-2`,
                { color: palette.text },
              ]}
            >
              Helpful
            </Text>

            <View style={tw`flex-row flex-wrap gap-2`}>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('OrgElearnPortal', {
                    ...assignNavParams,
                    from: 'learner',
                  })
                }
                style={[
                  tw`px-3 py-1 rounded-full`,
                  { backgroundColor: palette.divider },
                ]}
              >
                <Text
                  style={[
                    tw`text-xs`,
                    { color: palette.text },
                  ]}
                >
                  Assignments
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('OrgElearnPortal', {
                    tab: 'exams',
                    ...examsParams,
                    from: 'learner',
                  })
                }
                style={[
                  tw`px-3 py-1 rounded-full`,
                  { backgroundColor: palette.divider },
                ]}
              >
                <Text
                  style={[
                    tw`text-xs`,
                    { color: palette.text },
                  ]}
                >
                  Exam results
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Results', resultsNavParams)
                }
                style={[
                  tw`px-3 py-1 rounded-full`,
                  { backgroundColor: palette.divider },
                ]}
              >
                <Text
                  style={[
                    tw`text-xs`,
                    { color: palette.text },
                  ]}
                >
                  Certificates
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('Courses', courseNavParams)
                }
                style={[
                  tw`px-3 py-1 rounded-full`,
                  { backgroundColor: palette.divider },
                ]}
              >
                <Text
                  style={[
                    tw`text-xs`,
                    { color: palette.text },
                  ]}
                >
                  Course library
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('OrgProfile')}
                style={[
                  tw`px-3 py-1 rounded-full`,
                  { backgroundColor: palette.divider },
                ]}
              >
                <Text
                  style={[
                    tw`text-xs`,
                    { color: palette.text },
                  ]}
                >
                  Institution profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.navigate('Help')}
                style={[
                  tw`px-3 py-1 rounded-full`,
                  { backgroundColor: palette.divider },
                ]}
              >
                <Text
                  style={[
                    tw`text-xs`,
                    { color: palette.text },
                  ]}
                >
                  Help
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default OrgLearnerHomeNative;
