// apps/mobile/src/pages/Profile.native.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import tw from '../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import { useCourses } from '@mytutorapp/shared/hooks';
import { useEnrollments } from '@mytutorapp/shared/hooks/useEnrollments';
import { useCourseProgress } from '@mytutorapp/shared/hooks/useCourseProgress';
import type { Course, Enrollment, CourseProgress } from '@mytutorapp/shared/types';
import type { AxiosError } from 'axios';
import { fetchEarningsSummary } from '@mytutorapp/shared/api/accountApi';

// If you already have native versions, import them instead:
import PaymentWidget from './PaymentWidget.native';
import ThemeToggle from '../screens/ThemeToggle.native';
import DeleteAccount from '../screens/DeleteAccount.native';
import RefundCenter from '../screens/RefundCenter.native';

// If you have a central route type, import it; otherwise define the bits we use here:
type MainStackParamList = {
  Home: undefined;
  SettingsManage: undefined;
  SettingsCreate: undefined;
  Messages: undefined;
  Notifications: undefined;
  Courses: undefined;
  MyEnrollments: undefined;
  ClassVault: undefined;
  CreateCourse: undefined;
  Achievements: undefined;
  Earnings: undefined;
  CourseProgress: { courseId: string };
};

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
        <Text numberOfLines={1} style={tw`text-base font-medium`}>{title}</Text>
        <Text style={tw`text-sm font-semibold`}>{pct}%</Text>
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
          <Text style={tw`text-sm font-semibold`}>{validId ? 'Open progress' : 'Unavailable'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

/* ---------------------------------- Screen ---------------------------------- */
const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<MainStackParamList>>();
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
    reftechDetails,        // typo-supported
    refreshProfile,
    refreshWallet,
    setTokens: setCtxTokens,
  } = useShopContext() as any;

  // routing helpers
  const goHome = () => navigation.navigate('Home');
  const goSettingsManage = () => navigation.navigate('SettingsManage');
  const goSettingsCreate = () => navigation.navigate('SettingsCreate');
  const goMessages = () => navigation.navigate('Messages');
  const goNotifications = () => navigation.navigate('Notifications');
  const goCourses = () => navigation.navigate('Courses');
  const goEnrollments = () => navigation.navigate('MyEnrollments');
  const goClassVault = () => navigation.navigate('ClassVault');
  const goCreateCourse = () => navigation.navigate('CreateCourse');
  const goAchievements = () => navigation.navigate('Achievements');
  const goAccountEarnings = () => navigation.navigate('Earnings');
  const goCourseProgress = (courseId: string) =>
    navigation.navigate('CourseProgress', { courseId });

  // no-op org-mode redirect on native
  useEffect(() => {}, []);

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
    try { await logout(); } finally { goHome(); }
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

  // Type PaymentWidget props locally and render a typed alias so TS accepts our props
  type PaymentWidgetProps = {
    isOpen: boolean;
    onClose: () => Promise<void> | void;
    title?: string;
    showTutorPreview?: boolean;
  };
  const PaymentWidgetTyped = PaymentWidget as React.ComponentType<PaymentWidgetProps>;

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
      <ScrollView contentContainerStyle={tw`py-5 px-4`}>
        {/* Header row */}
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <Text style={tw`text-[28px] font-extrabold text-[#0d141c] dark:text-white`}>My profile</Text>
          <Pressable
            onPress={onEditOrCreateProfile}
            disabled={loadingProfile}
            style={tw`md:hidden rounded-xl h-10 px-4 items-center justify-center ${shouldEmphasizeCta ? 'bg-[#3d99f5]' : 'bg-[#e7edf4] dark:bg-[#172534]'}`}
          >
            <Text style={tw`font-bold ${shouldEmphasizeCta ? 'text-white' : ''}`}>{ctaLabel}</Text>
          </Pressable>
        </View>

        {/* Tutor missing profile alert */}
        {/* ... unchanged UI content above ... */}

        {/* Identity card */}
        <View style={tw`rounded-2xl border border-[#cedbe8] dark:border-white/10 bg-white dark:bg-[#0f1821] p-4`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center gap-4`}>
              <Image source={{ uri: avatarUrl }} style={tw`h-24 w-24 rounded-full`} />
              <View>
                <Text style={tw`text-[20px] font-bold text-[#0d141c] dark:text-white`}>{p.name || 'You'}</Text>
                <Text style={tw`text-sm text[#49739c] dark:text-white/70`}>{resolvedRole}</Text>
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
        </View>

        {/* Personal info form (local-only UI) */}
        {/* ... unchanged personal info inputs ... */}

        {/* Payments / Earnings */}
        {/* ... earnings section unchanged ... */}

        {!isTutor && (
          <PaymentWidgetTyped
            isOpen={openPayment}
            onClose={handlePaymentClose}
            title="Top up your tokens"
            showTutorPreview={false}
          />
        )}

        {/* Refund center (students) */}
        {/* ... unchanged ... */}

        {/* Student progress */}
        {/* ... unchanged list mapping ... */}
        {/* In the StudentProgressRow onOpenProgress handler we already call goCourseProgress(cid) */}

        {/* Courses section */}
        {/* ... unchanged ... */}

        {/* App settings */}
        {/* ... unchanged ... */}

        {/* Logout + Delete */}
        <View style={tw`py-4`}>
          <View style={tw`flex-row items-center justify-between`}>
            <Pressable onPress={onLogout} style={tw`h-10 px-4 rounded-xl items-center justify-center bg-[#e7edf4] dark:bg-[#172534]`}>
              <Text style={tw`font-bold`}>Log out</Text>
            </Pressable>
            {/* Removed unsupported triggerClassName prop to satisfy TS on native */}
            <DeleteAccount label="Delete Account" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
