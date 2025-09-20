/* apps/mobile/src/screens/org/OrgInviteLanding.native.tsx */

import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import tw from '../../../tailwind';
import {
  useRoute,
  useNavigation,
  RouteProp,
  NavigationProp,
} from '@react-navigation/native';
import { useShopContext } from '@mytutorapp/shared/context';
import { useOrgInvite } from '@mytutorapp/shared/hooks';
import { acceptOrgInvite } from '@mytutorapp/shared/api';
import type { OrgInviteInfo } from '@mytutorapp/shared/types';

// Adjust if your app has a typed stack
type MainStackParamList = {
  OrgInviteLanding: { code: string };
  OrgLogin: { next?: string; reason?: string } | undefined;
  RobotTeacher: { assignmentId: string; courseId?: string; lock?: string; flow?: string; qt?: string; qs?: string } | undefined;
  // Add other routes as needed
};

type ScreenRoute = RouteProp<MainStackParamList, 'OrgInviteLanding'>;
type Nav = NavigationProp<MainStackParamList>;

// --- normalize & resolve quizType from varying shapes (same as web)
type QuizType = 'mcq' | 'short';
const normalizeQuizType = (v: unknown): QuizType | null => {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return null;
  if (['mcq', 'multiple', 'multiple_choice', 'multiple-choice', 'choice', 'choices'].includes(s)) return 'mcq';
  if (['short', 'open', 'free', 'shortanswer', 'short-answer', 'short_answer', 'written', 'fill', 'fill_in', 'fill-in'].includes(s)) return 'short';
  return null;
};
const resolveLockedConfig = (meta: any) =>
  meta?.locked_config ?? meta?.meta?.locked_config ?? meta?.assignment?.locked_config ?? null;
const resolveQuizType = (meta: any): QuizType | null => {
  const lc = resolveLockedConfig(meta);
  const raw = lc?.quizType ?? meta?.quiz_type ?? meta?.quizType ?? null;
  return normalizeQuizType(raw);
};
const resolveQuizSize = (meta: any): number | null => {
  const lc = resolveLockedConfig(meta);
  const raw = lc?.quizSize ?? meta?.quiz_size ?? meta?.quizSize ?? null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const ROBOT_SCREEN: keyof MainStackParamList = 'RobotTeacher';

const OrgInviteLandingNative: React.FC = () => {
  const route = useRoute<ScreenRoute>();
  const navigation = useNavigation<Nav>();
  const code = route.params?.code ?? '';

  const { backendUrl, token } = useShopContext();
  const { data: meta, loading } = useOrgInvite(code);

  const [error, setError] = useState<string>('');
  const [accepting, setAccepting] = useState<boolean>(false);

  // ---- Domain restriction (from backend /invite/:code policy) ----
  const policy = useMemo(() => (meta as any)?.policy || {}, [meta]);
  const allowedDomains: string[] = useMemo(
    () => (Array.isArray(policy?.allowed_domains) ? policy.allowed_domains : []),
    [policy]
  );
  const domainRestricted = !!policy?.domain_restricted && allowedDomains.length > 0;

  // Labels
  const passMarkLabel = useMemo(() => {
    if (!meta) return '—';
    const assess = (meta as any)?.policy?.assessment || {};
    const fallback = (meta as any)?.pass_mark ?? (meta as any)?.default_pass_mark;
    const pass = assess.default_pass_mark ?? fallback;
    return pass != null ? `${pass}%` : '—';
  }, [meta]);

  const timerLabel = useMemo(() => {
    if (!meta) return '—';
    const assess = (meta as any)?.policy?.assessment || {};
    const secs = assess.quiz_time_limit_s ?? (meta as any)?.timer_s ?? (meta as any)?.quiz_time_limit_s;
    if (!secs) return '—';
    return secs % 60 === 0 ? `${secs / 60} min` : `${secs}s`;
  }, [meta]);

  const dueLabel = useMemo(() => {
    const dRaw = (meta as OrgInviteInfo | undefined)?.due_at;
    if (!dRaw) return null;
    try {
      const d = new Date(dRaw);
      return d.toLocaleString();
    } catch {
      return dRaw;
    }
  }, [meta]);

  const quizType = useMemo(() => resolveQuizType(meta as any), [meta]);
  const quizSize = useMemo(() => resolveQuizSize(meta as any), [meta]);

  const quizTypeLabel = useMemo(() => {
    if (!quizType) return '—';
    return quizType === 'short' ? 'Short answers (typed)' : 'Multiple choice (MCQ)';
  }, [quizType]);

  const quizTypeDesc = useMemo(() => {
    if (!quizType) return '';
    return quizType === 'short'
      ? 'You’ll type your answers. You can use subscripts/superscripts (e.g., H₂SO₄, SO₄²⁻). We’ll auto-mark.'
      : 'You’ll choose one of four options for each question.';
  }, [quizType]);

  const onAccept = useCallback(async () => {
    setError('');
    if (!code) {
      setError('Invalid invite.');
      return;
    }

    // Require auth; send to org login (native route) with a next param
    if (!token) {
      navigation.navigate('OrgLogin', {
        next: `/org/join/${code}`,
        reason: 'org_invite',
      });
      return;
    }

    setAccepting(true);
    try {
      const resp: any = await acceptOrgInvite(backendUrl, token, code);

      if (!resp?.ok) {
        throw new Error(resp?.message || 'Failed to accept invite.');
      }

      const enrollment = resp.enrollment ?? resp.attempt ?? resp;

      const assignmentId =
        enrollment?.assignmentId ?? (meta as OrgInviteInfo | undefined)?.id ?? null;

      const courseId =
        enrollment?.courseId ?? (meta as OrgInviteInfo | undefined)?.course_id ?? '';

      if (!assignmentId) {
        throw new Error('Invite accepted, but no assignment found.');
      }

      const qt = resolveQuizType(meta as any);
      const qs = resolveQuizSize(meta as any);

      // Navigate to RobotTeacher screen with params (app enforces assignmentId)
      navigation.navigate(ROBOT_SCREEN, {
        assignmentId: String(assignmentId),
        courseId: courseId ? String(courseId) : undefined,
        lock: '1',
        flow: 'org',
        ...(qt ? { qt } : {}),
        ...(qs ? { qs: String(qs) } : {}),
      });
    } catch (e: any) {
      const apiMsg = e?.response?.data?.message || e?.message;
      const apiCode = e?.response?.data?.code;

      if (apiCode === 'EMAIL_DOMAIN_BLOCKED' && domainRestricted) {
        setError(
          `You're signed in with an email that isn’t allowed for this organization. Allowed domain(s): ${allowedDomains.join(
            ', '
          )}. Please sign in using an email on one of those domains, or ask your admin to add your domain.`
        );
      } else {
        setError(apiMsg || 'Failed to accept invite.');
      }
    } finally {
      setAccepting(false);
    }
  }, [backendUrl, token, code, navigation, meta, domainRestricted, allowedDomains]);

  // ------- UI -------
  const orgName = (meta as OrgInviteInfo | undefined)?.org_name ?? '';
  const title = (meta as OrgInviteInfo | undefined)?.title_override || 'Assigned Course';
  const logoUrl = (meta as OrgInviteInfo | undefined)?.logo_url;
  const signatureUrl = (meta as OrgInviteInfo | undefined)?.signature_url;
  const maxAttempts = (meta as OrgInviteInfo | undefined)?.max_attempts;

  return (
    <View style={tw`flex-1 bg-[#0b1220] px-3 pt-6 pb-4`}>
      <ScrollView contentContainerStyle={tw`grow items-center`}>
        <View style={tw`w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-4`}>
          {/* Loading / invalid */}
          {!meta ? (
            <View>
              <Text style={tw`text-white/80 text-sm`}>
                {error || (loading ? 'Loading…' : 'Invalid invite.')}
              </Text>
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={tw`flex-row items-center`}>
                {!!logoUrl && (
                  <Image
                    source={{ uri: logoUrl }}
                    style={tw`h-10 w-10 rounded mr-3`}
                    resizeMode="cover"
                  />
                )}
                <View style={tw`flex-1`}>
                  <Text style={tw`text-white/70 text-[13px]`}>Invitation to learn</Text>
                  <Text style={tw`text-white text-lg font-semibold`} numberOfLines={2}>
                    {title}
                  </Text>
                  {!!orgName && (
                    <Text style={tw`text-white/70 text-sm`} numberOfLines={1}>
                      {orgName}
                    </Text>
                  )}
                </View>
              </View>

              {/* Meta row */}
              <View style={tw`flex-row flex-wrap mt-4`}>
                <View style={tw`px-2 py-1 mr-2 mb-2 rounded-full bg-white/10`}>
                  <Text style={tw`text-white text-xs`}>Pass mark: <Text style={tw`font-bold`}>{passMarkLabel}</Text></Text>
                </View>
                <View style={tw`px-2 py-1 mr-2 mb-2 rounded-full bg-white/10`}>
                  <Text style={tw`text-white text-xs`}>Timer: <Text style={tw`font-bold`}>{timerLabel}</Text></Text>
                </View>
                {typeof maxAttempts === 'number' && (
                  <View style={tw`px-2 py-1 mr-2 mb-2 rounded-full bg-white/10`}>
                    <Text style={tw`text-white text-xs`}>
                      Attempts: <Text style={tw`font-bold`}>{maxAttempts === 0 ? '∞' : maxAttempts}</Text>
                    </Text>
                  </View>
                )}
                {!!dueLabel && (
                  <View style={tw`px-2 py-1 mr-2 mb-2 rounded-full bg-white/10`}>
                    <Text style={tw`text-white text-xs`}>Due: <Text style={tw`font-bold`}>{dueLabel}</Text></Text>
                  </View>
                )}
                <View style={tw`px-2 py-1 mr-2 mb-2 rounded-full bg-white/10`}>
                  <Text style={tw`text-white text-xs`}>
                    Answer type: <Text style={tw`font-bold`}>{quizTypeLabel}</Text>
                  </Text>
                </View>
                {quizSize != null && (
                  <View style={tw`px-2 py-1 mr-2 mb-2 rounded-full bg-white/10`}>
                    <Text style={tw`text-white text-xs`}>
                      Questions: <Text style={tw`font-bold`}>{quizSize}</Text>
                    </Text>
                  </View>
                )}
              </View>

              {/* What to expect */}
              <View style={tw`mt-3 rounded-xl border border-white/10 bg-white/5 p-3 flex-row`}>
                <View
                  style={tw`h-8 w-8 rounded-lg items-center justify-center mr-3 ${quizType === 'short' ? 'bg-emerald-600' : 'bg-indigo-600'}`}
                >
                  {/* simple glyph */}
                  <Text style={tw`text-white`}>{quizType === 'short' ? '⌨️' : '📝'}</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-white text-sm font-semibold`}>{quizTypeLabel}</Text>
                  <Text style={tw`text-white/70 text-xs mt-0.5`}>
                    {quizTypeDesc || 'Your organization set the answer format for this quiz.'}
                  </Text>
                </View>
              </View>

              {/* Domain restriction */}
              {domainRestricted && (
                <View style={tw`mt-3 rounded-lg bg-yellow-500/10 border border-yellow-400/20 p-3`}>
                  <Text style={tw`text-yellow-200 text-xs font-semibold`}>Restricted invite</Text>
                  <Text style={tw`text-yellow-200 text-xs mt-1`}>
                    Only emails from <Text style={tw`font-bold`}>{allowedDomains.join(', ')}</Text> can accept this invite.
                    {token
                      ? ' If this isn’t your organization email, sign out and sign back in with the permitted address.'
                      : ' Please sign in using an email on one of those domains.'}
                  </Text>
                </View>
              )}

              {/* Actions */}
              <View style={tw`mt-4`}>
                <TouchableOpacity
                  onPress={onAccept}
                  disabled={accepting || loading}
                  style={tw`w-full rounded-xl bg-emerald-600 py-3 items-center ${accepting || loading ? 'opacity-60' : ''}`}
                >
                  {accepting || loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={tw`text-white font-semibold`}>
                      {token
                        ? 'Accept & Join'
                        : domainRestricted
                          ? 'Sign in with org email'
                          : 'Sign in to start'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={tw`mt-2 w-full rounded-xl bg-white/10 py-3 items-center`}
                >
                  <Text style={tw`text-white`}>Cancel</Text>
                </TouchableOpacity>
              </View>

              {/* Signature (optional) */}
              {!!signatureUrl && (
                <View style={tw`mt-4 items-start`}>
                  <Image
                    source={{ uri: signatureUrl }}
                    style={tw`h-10 w-40 opacity-70`}
                    resizeMode="contain"
                  />
                </View>
              )}

              {/* Error */}
              {!!error && (
                <Text style={tw`mt-3 text-yellow-300 text-xs`}>{error}</Text>
              )}

              {/* Footnote */}
              {!!orgName && (
                <Text style={tw`mt-4 text-[12px] text-white/60`}>
                  By starting, you’ll be added as a learner in <Text style={tw`font-semibold`}>{orgName}</Text> for this course.
                  Your attempt may be timed and limited by your organization’s policy.
                </Text>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default OrgInviteLandingNative;
