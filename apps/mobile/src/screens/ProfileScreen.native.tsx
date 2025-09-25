import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
   View,
   Text,
   ScrollView,
   Image,
   TextInput,
   Pressable,
   ActivityIndicator,
 } from 'react-native';
import { useNavigation, NavigationProp, StackActions } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import tw from '../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses } from '@mytutorapp/shared/hooks';
import { useEnrollments } from '@mytutorapp/shared/hooks/useEnrollments';
import { useCourseProgress } from '@mytutorapp/shared/hooks/useCourseProgress';
import type { Course, Enrollment, CourseProgress } from '@mytutorapp/shared/types';
import type { AxiosError } from 'axios';
import { fetchEarningsSummary } from '@mytutorapp/shared/api/accountApi';

import PaymentWidget from './PaymentWidget.native';
import ThemeToggle from '../screens/ThemeToggle.native';
import DeleteAccount from '../screens/DeleteAccount.native';
import RefundCenter from '../screens/RefundCenter.native';

import type { MainStackParamList } from '../navigation/types';

/* ---------- utils ---------- */
const FALLBACK_AVATAR = (n = 'You') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=223649&color=ffffff`;

const resolveAsset = (raw?: string, backendUrl?: string, fallbackName?: string) => {
  if (!raw) return FALLBACK_AVATAR(fallbackName ?? 'You');
  if (raw.startsWith('/') && backendUrl) return `${backendUrl.replace(/\/+$/, '')}${raw}`;
  return raw;
};

const toNum = (v: unknown, fb = 0): number =>
  typeof v === 'number' && Number.isFinite(v)
    ? v
    : typeof v === 'string'
    ? Number(v) || fb
    : fb;

const isUuid = (s?: string | null): s is string =>
  !!s && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s || '');

const isValidCourseId = (id: unknown): id is string =>
  typeof id === 'string' ? (isUuid(id) || /^\d+$/.test(id)) : (typeof id === 'number' && Number.isFinite(id));

const getCourseId = (row: unknown): string | null => {
  const o = (row ?? {}) as Record<string, unknown>;
  const v =
    (typeof o.courseId === 'string' || typeof o.courseId === 'number') ? o.courseId :
    (typeof o['course_id'] === 'string' || typeof o['course_id'] === 'number') ? o['course_id'] :
    null;
  return v == null ? null : String(v);
};

const hasPayoutSetup = (prof?: any): boolean => {
  if (!prof) return false;
  const method   = prof?.payout_method ?? prof?.payoutMethod;
  const currency = prof?.payout_currency ?? prof?.payoutCurrency;
  const wise     = prof?.wise_email ?? prof?.wiseEmail;
  const mpesa    = prof?.mpesa_phone_number ?? prof?.mpesaPhoneNumber;
  return Boolean(method || currency || wise || mpesa);
};

type ProfileLike = {
  id?: string | number;
  user_id?: string | number;
  name?: string;
  role?: string;
  avatar?: string;
  photoUrl?: string;
  avatar_url?: string;
  gallery?: string[];
};

type EarningsSummaryLocal = { total: number; pending: number; available: number; currency?: string };

/* ---------- student progress row (native) ---------- */
const StudentProgressRow: React.FC<{
  courseId: string | null;
  title: string;
  backendUrl: string;
  token: string;
  fallbackPct?: number;
  onOpenProgress: (courseId?: string) => void;
}> = ({ courseId, title, backendUrl, token, fallbackPct = 0, onOpenProgress }) => {
  const validId = isValidCourseId(courseId ?? '');
  const cid = validId ? String(courseId) : '';

  const { progress, loading } = useCourseProgress(backendUrl, cid, token);
  const { fetchCourseById } = useCourses({ backendUrl, token });
  const [totalWeeks, setTotalWeeks] = useState<number>(0);

  useEffect(() => {
    if (!validId) { setTotalWeeks(0); return; }
    let ignore = false;
    fetchCourseById(cid)
      .then((c: Course) => { if (!ignore) setTotalWeeks(Array.isArray(c?.syllabus) ? c.syllabus.length : 0); })
      .catch(() => setTotalWeeks(0));
    return () => { ignore = true; };
  }, [fetchCourseById, cid, validId]);

  const pct = useMemo(() => {
    if (!validId) return Math.max(0, Math.min(100, Math.round(fallbackPct)));
    if (loading) return 0;
    const items: CourseProgress[] = Array.isArray(progress) ? progress : [];
    const completed = items.filter((p) => p.status === 'Completed').length;
    if (totalWeeks > 0) return Math.round((completed / totalWeeks) * 100);
    return Math.max(0, Math.min(100, Math.round(fallbackPct)));
  }, [progress, loading, totalWeeks, fallbackPct, validId]);

  return (
    <View style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] px-4 py-3`}>
      <View style={tw`flex-row items-center justify-between`}>
        <Text numberOfLines={1} style={tw`text-base font-medium text-[#0d141c] dark:text-white`}>{title}</Text>
        <Text style={tw`text-sm font-semibold text-[#0d141c] dark:text-white`}>{pct}%</Text>
      </View>
      <View style={tw`mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#cedbe8] dark:bg-white/10`}>
        <View style={[tw`h-full bg-[#3d99f5]`, { width: `${pct}%` }]} />
      </View>
      <View style={tw`mt-2`}>
        <Pressable
          disabled={!validId}
          onPress={() => onOpenProgress(validId ? cid : undefined)}
          style={tw`${validId ? 'bg-[#e7edf4] dark:bg-[#172534]' : 'bg-gray-200 dark:bg-gray-700 opacity-60'} rounded-lg h-8 px-3 items-center justify-center`}
        >
          <Text style={tw`text-sm font-semibold text-[#0d141c] dark:text-white`}>
            {validId ? 'Open progress' : 'Unavailable'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

/* ---------------------------------- Screen ---------------------------------- */
const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
  const insets = useSafeAreaInsets();

  // Match HomePage safe-area behavior
  const FOOTER_OVERLAY_PX = 84;                  // floating footer/tiles height
  const NAV_SPACER_PX = 12;                      // gentle top spacer like HomePage
  const bottomPad = Math.max(FOOTER_OVERLAY_PX, FOOTER_OVERLAY_PX + insets.bottom);

  const {
    profile,
    backendUrl,
    userEmail,
    role: ctxRole,
    logout,
    language,
    tokens = 0,
    token,
    loadingProfile,
    refetchDetails,
    reftechDetails,
    refreshProfile,
    refreshWallet,
    setTokens: setCtxTokens,
  } = useShopContext() as any;

  // routing helpers — use MainStackParamList routes only
  const goHome = () => navigation.navigate('Home');
  const goLogin = () => navigation.dispatch(StackActions.replace('Login'));
  const goSettingsManage = () => navigation.navigate('SettingsManage');
  const goSettingsCreate = () => navigation.navigate('SettingsCreate');
  const goMessages = () => navigation.navigate('Messages' as any);
  const goCourses = () => navigation.navigate('Courses');
  const goEnrollments = () => navigation.navigate('MyEnrollments');
  const goClassVault = () => navigation.navigate('ClassVaultLibrary');
  const goCreateCourse = () => navigation.navigate('CreateCourse');
  const goAchievements = () => navigation.navigate('Achievements');
  const goAccountEarnings = () => navigation.navigate('Account', { tab: 'earnings' });
  const goCourseProgress = (courseId: string) => navigation.navigate('CourseProgress', { courseId });

  // /api/user/me fallback for email/role
  const [meEmail, setMeEmail] = useState<string | null>(null);
  const [meRole, setMeRole] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const needEmail = !userEmail;
    const needRole = !ctxRole && !(profile as ProfileLike | undefined)?.role;

    if (token && (needEmail || needRole)) {
      (async () => {
        try {
          const r = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/user/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const j = (await r.json()) as { success?: boolean; email?: string; role?: string };
          if (!cancelled && j?.success) {
            if (j.email) setMeEmail(j.email);
            if (j.role) setMeRole(j.role);
          }
        } catch {}
      })();
    }
    return () => { cancelled = true; };
  }, [backendUrl, token, userEmail, ctxRole, profile]);

  const hasProfile = Boolean(profile);
  const p = (profile ?? {}) as ProfileLike;

  const resolvedEmail = userEmail || meEmail || '';
  const resolvedRoleRaw = String(p.role || ctxRole || meRole || '').trim();
  const resolvedRole = resolvedRoleRaw || 'Member';
  const roleLower = resolvedRoleRaw.toLowerCase();
  const isStudent = roleLower === 'student' || roleLower === 'learner' || roleLower === 'pupil';
  const isTutor = roleLower === 'tutor';

  const canSeeEarnings = useMemo(() => isTutor && hasPayoutSetup(p), [isTutor, p]);

  const avatarUrl = useMemo(
    () => resolveAsset(p.avatar ?? p.photoUrl ?? p.avatar_url ?? p.gallery?.[0], backendUrl, p.name || 'You'),
    [p.avatar, p.photoUrl, p.avatar_url, p.gallery, backendUrl, p.name]
  );

  const [name, setName] = useState<string>(p.name || '');
  const [email, setEmail] = useState<string>(resolvedEmail);
  const [phone, setPhone] = useState<string>('');
  const [tz, setTz] = useState<string>('');
  const [notif, setNotif] = useState<boolean>(true);
  const [openPayment, setOpenPayment] = useState(false);
  const [refreshingTokens, setRefreshingTokens] = useState(false);

  useEffect(() => setName(p.name || ''), [p.name]);
  useEffect(() => setEmail(resolvedEmail), [resolvedEmail]);

  const onEditOrCreateProfile = () => (hasProfile ? goSettingsManage() : goSettingsCreate());

  const onLogout = async () => {
    try {
      await logout();                 // clears token/session
    } finally {
      goLogin();                      // hard replace to Login
      
    }
  };

  // tutor earnings
  const [earn, setEarn] = useState<EarningsSummaryLocal>({ total: 0, pending: 0, available: 0, currency: 'USD' });
  const [earnLoading, setEarnLoading] = useState(false);
  const [earnErr, setEarnErr] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    (async () => {
      if (!canSeeEarnings || !backendUrl || !token) return;
      setEarnLoading(true);
      try {
        const summary = await fetchEarningsSummary(backendUrl, token);
        if (!stop) {
          setEarn({
            total: summary.total ?? 0,
            pending: summary.pending ?? 0,
            available: summary.available ?? 0,
            currency: summary.currency || 'USD',
          });
          setEarnErr(null);
        }
      } catch (err) {
        if (stop) return;
        const ax = err as AxiosError<{ message?: string }>;
        const status = ax.response?.status;
        if (status === 401) setEarnErr('Please log in again to view earnings.');
        else if (status === 403) setEarnErr('Earnings are restricted for your account.');
        else setEarnErr(ax.response?.data?.message || 'Failed to load earnings.');
      } finally {
        if (!stop) setEarnLoading(false);
      }
    })();
    return () => { stop = true; };
  }, [canSeeEarnings, backendUrl, token]);

  const fmtMoney = useCallback(
    (n: number, c?: string) =>
      new Intl.NumberFormat(undefined, { style: 'currency', currency: c || 'USD', maximumFractionDigits: 2 }).format(n),
    []
  );

  // enrollments (student)
  const meId = (p.user_id ?? p.id) as string | number | undefined;
  const { enrollments, loading: enrLoading, error: enrError, fetchMine } = useEnrollments({
    backendUrl,
    token: token ?? '',
    studentId: (meId ?? 'me') as string | number,
  });

  useEffect(() => { if (isStudent) fetchMine().catch(() => {}); }, [isStudent, fetchMine]);

  // refresh wallet after payment closes
  const refreshAccountState = useCallback(async () => {
    setRefreshingTokens(true);
    try {
      if (typeof refetchDetails === 'function') { await refetchDetails(); return; }
      if (typeof reftechDetails === 'function') { await reftechDetails(); return; }
      if (typeof refreshWallet === 'function') await refreshWallet();
      if (typeof refreshProfile === 'function') await refreshProfile();
      if (typeof setCtxTokens === 'function' && token && backendUrl) {
        try {
          const r = await fetch(`${backendUrl.replace(/\/+$/, '')}/api/account/balance`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (r.ok) {
            const j = await r.json();
            const bal = Number(j?.balance ?? j?.tokens ?? j?.data?.balance ?? j?.data?.tokens ?? NaN);
            if (Number.isFinite(bal)) setCtxTokens(bal);
          }
        } catch {}
      }
    } finally {
      setRefreshingTokens(false);
    }
  }, [refetchDetails, reftechDetails, refreshWallet, refreshProfile, setCtxTokens, token, backendUrl]);

  const handlePaymentClose = useCallback(async () => {
    setOpenPayment(false);
    await refreshAccountState();
  }, [refreshAccountState]);

  const ctaLabel = loadingProfile ? 'Loading…' : hasProfile ? 'Edit profile' : 'Create profile';
  const shouldEmphasizeCta = isTutor && !hasProfile && !loadingProfile;

  // Typed alias for PaymentWidget
  type PaymentWidgetProps = {
    isOpen: boolean;
    onClose: () => Promise<void> | void;
    title?: string;
    showTutorPreview?: boolean;
  };
  const PaymentWidgetTyped = PaymentWidget as React.ComponentType<PaymentWidgetProps>;

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={[
          tw`px-4`,
          { paddingTop: insets.top + NAV_SPACER_PX, paddingBottom: bottomPad }
        ]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {/* Header row */}
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <Text style={tw`text-[28px] font-extrabold text-[#0d141c] dark:text-white`}>My profile</Text>
          <Pressable
          onPress={onEditOrCreateProfile}
          disabled={loadingProfile}
          style={tw`md:hidden rounded-xl h-10 px-4 items-center justify-center ${shouldEmphasizeCta ? 'bg-[#3d99f5] animate-pulse' : 'bg-[#e7edf4] dark:bg-[#172534]'} ${loadingProfile ? 'opacity-60' : ''}`}
        >
          <Text
            style={tw`font-bold ${shouldEmphasizeCta ? 'text-white' : 'text-[#0d141c] dark:text-white'}`}
          >
            {ctaLabel}
          </Text>
        </Pressable>

        </View>

        {/* Tutor missing-profile alert */}
        {isTutor && !hasProfile && !loadingProfile && (
          <View style={tw`mb-3 rounded-2xl border border-amber-300 bg-amber-50 dark:border-amber-600/40 dark:bg-[#241a06] p-4`}>
            <Text style={tw`font-semibold text-amber-900 dark:text-amber-200`}>No tutor profile found</Text>
            <Text style={tw`text-sm mt-0.5 text-amber-900/90 dark:text-amber-200/90`}>
              You’re signed in as a tutor. Create your profile so students can discover and book you.
            </Text>
            <View style={tw`mt-2`}>
              <Pressable
                onPress={onEditOrCreateProfile}
                disabled={loadingProfile}
                style={tw`hidden md:flex rounded-xl h-10 px-4 items-center justify-center ${shouldEmphasizeCta ? 'bg-[#3d99f5]' : 'bg-[#e7edf4] dark:bg-[#172534]'} ${loadingProfile ? 'opacity-60' : ''}`}
              >
                <Text
                  style={tw`font-bold ${shouldEmphasizeCta ? 'text-white' : 'text-[#0d141c] dark:text-white'}`}
                >
                  {ctaLabel}
                </Text>
              </Pressable>

            </View>
          </View>
        )}

        {/* Identity card */}
        <View style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center gap-4`}>
              <Image source={{ uri: avatarUrl }} style={tw`h-24 w-24 rounded-full`} />
              <View>
                <Text style={tw`text-[20px] font-bold text-[#0d141c] dark:text-white`}>{p.name || 'You'}</Text>
                <Text style={tw`text-sm text-[#49739c] dark:text-white/70`}>{resolvedRole}</Text>
                {!!resolvedEmail && <Text style={tw`text-xs text-[#49739c] dark:text-white/70 mt-0.5`}>{resolvedEmail}</Text>}
              </View>
            </View>
            <Pressable
              onPress={onEditOrCreateProfile}
              disabled={loadingProfile}
              style={tw`hidden md:flex rounded-xl h-10 px-4 items-center justify-center ${shouldEmphasizeCta ? 'bg-[#3d99f5]' : 'bg-[#e7edf4] dark:bg-[#172534]'}`}
            >
              <Text style={tw`font-bold ${shouldEmphasizeCta ? 'text-white' : ''}`}>{ctaLabel}</Text>
            </Pressable>
          </View>
          {(isTutor && !hasProfile && !loadingProfile) && (
            <Text style={tw`mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium`}>
              👉 Please create your tutor profile to get started!
            </Text>
          )}
        </View>

        {/* Personal information */}
        <Text style={tw`pt-4 pb-2 text-[20px] font-bold text-[#0d141c] dark:text-white`}>Personal information</Text>
        <View style={tw`gap-4`}>
          <View>
            <Text style={tw`pb-2 font-medium text-[#0d141c] dark:text-white`}>Full name</Text>
            <TextInput
              style={tw`h-12 rounded-xl border border-[#cedbe8] dark:border-white/10 bg-slate-50 dark:bg-[#0f1821] px-3 text-[#0d141c] dark:text-white`}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={tw.color('text-text-white/60') || '#94a3b8'}
            />
          </View>
          <View>
            <Text style={tw`pb-2 font-medium text-[#0d141c] dark:text-white`}>Email</Text>
            <TextInput
              style={tw`h-12 rounded-xl border border-[#cedbe8] dark:border-white/10 bg-slate-50 dark:bg-[#0f1821] px-3 text-[#0d141c] dark:text-white`}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={tw.color('text-text-white/60') || '#94a3b8'}
            />
          </View>
          <View>
            <Text style={tw`pb-2 font-medium text-[#0d141c] dark:text-white`}>Phone number</Text>
            <TextInput
              style={tw`h-12 rounded-xl border border-[#cedbe8] dark:border-white/10 bg-slate-50 dark:bg-[#0f1821] px-3 text-[#0d141c] dark:text-white`}
              value={phone}
              onChangeText={setPhone}
              placeholder="+0 000 000000"
              keyboardType="phone-pad"
              placeholderTextColor={tw.color('text-text-white/60') || '#94a3b8'}
            />
          </View>
          <View>
            <Text style={tw`pb-2 font-medium text-[#0d141c] dark:text-white`}>Time zone</Text>
            <TextInput
              style={tw`h-12 rounded-xl border border-[#cedbe8] dark:border-white/10 bg-slate-50 dark:bg-[#0f1821] px-3 text-[#0d141c] dark:text-white`}
              value={tz}
              onChangeText={setTz}
              placeholder="Africa/Nairobi"
              placeholderTextColor={tw.color('text-text-white/60') || '#94a3b8'}
            />
          </View>
        </View>

        {/* Payments / Earnings */}
        <Text style={tw`pt-6 pb-2 text-[20px] font-bold text-[#0d141c] dark:text-white`}>
          {isTutor ? 'Tutor earnings' : 'Payment management'}
        </Text>
        <View>
          {isTutor ? (
            <View style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}>
              <Text style={tw`font-medium text-[#0d141c] dark:text-white`}>Earnings summary</Text>
              <View style={tw`mt-3 rounded-xl p-4 bg-[#f6f9fc] dark:bg-[#0b1620] border border-[#cedbe8] dark:border-[#182430]`}>
                {earnLoading ? (
                  <Text style={tw`text-sm text-[#49739c]`}>Loading…</Text>
                ) : !canSeeEarnings ? (
                  <Text style={tw`text-sm text-[#49739c]`}>
                    Set up your payout method to enable earnings. <Text onPress={onEditOrCreateProfile} style={tw`font-semibold`}>Open profile</Text>
                  </Text>
                ) : earnErr ? (
                  <Text style={tw`text-sm text-red-600`}>{earnErr}</Text>
                ) : (
                  <>
                    <Text style={tw`text-sm text-[#49739c]`}>Available ({earn.currency || 'USD'})</Text>
                    <Text style={tw`text-3xl font-extrabold text-[#0d141c] dark:text-white`}>{fmtMoney(earn.available, earn.currency)}</Text>
                  </>
                )}
              </View>
              {(canSeeEarnings && !earnLoading && !earnErr) && (
                <View style={tw`mt-3 flex-row gap-3`}>
                  <View style={tw`flex-1 rounded-lg p-3 bg-[#e7edf4]/60 dark:bg-[#172534]`}>
                    <Text style={tw`text-[#49739c]`}>Total earned</Text>
                    <Text style={tw`font-semibold text-[#0d141c] dark:text-white`}>{fmtMoney(earn.total, earn.currency)}</Text>
                  </View>
                  <View style={tw`flex-1 rounded-lg p-3 bg-[#e7edf4]/60 dark:bg-[#172534]`}>
                    <Text style={tw`text-[#49739c]`}>Pending</Text>
                    <Text style={tw`font-semibold text-[#0d141c] dark:text-white`}>{fmtMoney(earn.pending, earn.currency)}</Text>
                  </View>
                </View>
              )}
              <View style={tw`mt-3 flex-row`}>
                <Pressable
                  onPress={goAccountEarnings}
                  disabled={!canSeeEarnings}
                  style={tw`${canSeeEarnings ? 'bg-[#e7edf4] dark:bg-[#172534]' : 'bg-gray-200 dark:bg-gray-700'} rounded-xl h-10 px-4 items-center justify-center`}
                >
                  <Text style={tw`font-semibold text-[#0d141c] dark:text-white`}>View details</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4 flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center gap-3`}>
                <View style={tw`w-12 h-12 rounded-lg bg-[#e7edf4] dark:bg-[#172534]`} />
                <View>
                  <Text style={tw`font-medium text-[#0d141c] dark:text-white`}>Session tokens</Text>
                  <Text style={tw`text-sm text-[#49739c]`}>
                    Balance: <Text style={tw`font-semibold`}>{tokens}</Text>
                    {refreshingTokens && <Text style={tw`opacity-60`}> (updating…)</Text>}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => setOpenPayment(true)}
                style={tw`rounded-xl h-10 px-4 bg-[#3d99f5] items-center justify-center`}
              >
                <Text style={tw`text-white font-semibold`}>Buy tokens</Text>
              </Pressable>
            </View>
          )}
        </View>

        {!isTutor && (
          <PaymentWidgetTyped
            isOpen={openPayment}
            onClose={handlePaymentClose}
            title="Top up your tokens"
            showTutorPreview={false}
          />
        )}

        {/* Refund Center (students) */}
        {isStudent && (
          <View style={tw`mt-3`}>
            <RefundCenter backendUrl={backendUrl} token={token} />
          </View>
        )}

        {/* Learning progress (students) */}
        {isStudent && (
          <View style={tw`pt-6`}>
            <Text style={tw`text-[20px] font-bold mb-3 text-[#0d141c] dark:text-white`}>Learning progress</Text>
            {enrLoading && <Text style={tw`text-sm text-[#49739c]`}>Loading your courses…</Text>}
            {!enrLoading && enrError && <Text style={tw`text-sm text-red-600`}>{String(enrError)}</Text>}
            {!enrLoading && !enrError && (
              <View style={tw`gap-3`}>
                {enrollments.slice(0, 8).map((e: Enrollment) => {
                  const courseId = getCourseId(e);
                  const maybeTitle = (e as unknown as Record<string, unknown>)['title'];
                  const title =
                    typeof maybeTitle === 'string' && maybeTitle.trim().length > 0
                      ? maybeTitle
                      : courseId ? `Course #${courseId}` : 'Course';
                  const fallbackPct = toNum((e as any).progress, 0);
                  return (
                    <StudentProgressRow
                      key={String((e as unknown as Record<string, unknown>).id ?? `${courseId}-${title}`)}
                      courseId={courseId}
                      title={title}
                      backendUrl={backendUrl}
                      token={token ?? ''}
                      fallbackPct={fallbackPct}
                      onOpenProgress={(cid?: string) => { if (cid) goCourseProgress(cid); }}
                    />
                  );
                })}
                {enrollments.length === 0 && (
                  <View style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-6`}>
                    <Text style={tw`text-base text-[#0d141c] dark:text-white`}>You have no enrollments yet.</Text>
                    <Text style={tw`text-sm text-[#49739c] mt-1`}>Browse the catalog to get started.</Text>
                    <View style={tw`mt-3`}>
                      <Pressable
                        onPress={goCourses}
                        style={tw`h-9 px-3 rounded-xl bg-[#e7edf4] dark:bg-[#172534] items-center justify-center`}
                      >
                        <Text style={tw`text-sm font-semibold text-[#0d141c] dark:text-white`}>Go to Catalog</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Courses section */}
        <Text style={tw`pt-6 pb-2 text-[20px] font-bold text-[#0d141c] dark:text-white`}>Courses</Text>
        {isTutor ? (
          <View style={tw`gap-3`}>
            <Pressable onPress={goClassVault} style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}>
              <Text style={tw`text-base font-semibold text-[#0d141c] dark:text-white`}>Video Vault</Text>
              <Text style={tw`text-[#8b5e00] dark:text-amber-200/90 text-sm mt-1`}>
                Upload recorded classes & notes. Students purchase with tokens — you earn automatically.
              </Text>
              <Text style={tw`mt-3 text-sm font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-[#0f1821] border border-amber-300/50 dark:border-amber-600/30 w-auto text-[#0d141c] dark:text-white`}>
                Go to Vault →
              </Text>
            </Pressable>

            <Pressable onPress={goCreateCourse} style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}>
              <Text style={tw`text-base font-semibold text-[#0d141c] dark:text-white`}>Create Course</Text>
              <Text style={tw`text-[#0b3a70] dark:text-blue-200/90 text-sm mt-1`}>
                Use our step-by-step builder to publish structured lessons, quizzes & certificates.
              </Text>
              <Text style={tw`mt-3 text-sm font-semibold px-3 py-1.5 rounded-lg bg-white dark:bg-[#0f1821] border border-blue-300/50 dark:border-blue-600/30 w-auto text-[#0d141c] dark:text-white`}>
                Start Builder →
              </Text>
            </Pressable>

            <Pressable onPress={goCourses} style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}>
              <Text style={tw`text-base font-semibold text-[#0d141c] dark:text-white`}>My Courses</Text>
              <Text style={tw`text-[#49739c] dark:text-white/70 text-sm`}>View, edit, update & delete</Text>
            </Pressable>

            <Pressable onPress={goAchievements} style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}>
              <Text style={tw`text-base font-semibold text-[#0d141c] dark:text-white`}>Badges</Text>
              <Text style={tw`text-[#49739c] dark:text-white/70 text-sm`}>Your milestones</Text>
            </Pressable>
          </View>
        ) : (
          <View style={tw`gap-3`}>
            <Pressable onPress={goEnrollments} style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}>
              <Text style={tw`text-base font-semibold text-[#0d141c] dark:text-white`}>My Enrollments</Text>
              <Text style={tw`text-[#49739c] dark:text-white/70 text-sm`}>View & unenroll</Text>
            </Pressable>
            <Pressable onPress={goAchievements} style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}>
              <Text style={tw`text-base font-semibold text-[#0d141c] dark:text-white`}>Badges</Text>
              <Text style={tw`text-[#49739c] dark:text-white/70 text-sm`}>View your achievements</Text>
            </Pressable>
          </View>
        )}

        {/* App settings */}
        <Text style={tw`pt-6 pb-2 text-[20px] font-bold text-[#0d141c] dark:text-white`}>App settings</Text>
        <View style={tw`gap-3`}>
          <View style={tw`flex-row items-center justify-between rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] px-4 py-3`}>
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-10 h-10 rounded-lg bg-[#e7edf4] dark:bg-[#172534]`} />
              <Text style={tw`text-[#0d141c] dark:text-white`}>Notifications</Text>
            </View>
            <Pressable
              onPress={() => setNotif(v => !v)}
              style={tw`${notif ? 'bg-[#3d99f5]' : 'bg-[#e7edf4] dark:bg-[#172534]'} relative h-[31px] w-[51px] rounded-full p-0.5`}
              accessibilityRole="switch"
              accessibilityState={{ checked: notif }}
            >
              <View style={[tw`h-full w-[27px] rounded-full bg-white`, { transform: [{ translateX: notif ? 20 : 0 }] }]} />
            </Pressable>
          </View>

          <View style={tw`flex-row items-center justify-between rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] px-4 py-3`}>
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-10 h-10 rounded-lg bg-[#e7edf4] dark:bg-[#172534]`} />
              <Text style={tw`text-[#0d141c] dark:text-white`}>Dark mode</Text>
            </View>
            <ThemeToggle />
          </View>

          <View style={tw`flex-row items-center justify-between rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] px-4 py-3`}>
            <View style={tw`flex-row items-center gap-3`}>
              <View style={tw`w-10 h-10 rounded-lg bg-[#e7edf4] dark:bg-[#172534]`} />
              <Text style={tw`text-[#0d141c] dark:text-white`}>Language</Text>
            </View>
            <Text style={tw`text-[#0d141c] dark:text-white`}>{language === 'FR' ? 'French' : 'English'}</Text>
          </View>
        </View>

        {/* Logout + Delete */}
        <View style={tw`py-4`}>
          <View style={tw`flex-row items-center justify-between`}>
            <Pressable onPress={onLogout} style={tw`h-10 px-4 rounded-xl items-center justify-center bg-[#e7edf4] dark:bg-[#172534]`}>
              <Text style={tw`font-bold text-[#0d141c] dark:text-white`}>Log out</Text>
            </Pressable>
            <DeleteAccount label="Delete Account" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
