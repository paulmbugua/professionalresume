// apps/mobile/src/screens/org/OrgHomeRouter.native.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import tw from '../../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import { useOrg } from '@mytutorapp/shared/hooks/useOrg';

type PendingDeepLink =
  | { type: 'robot'; assignmentId?: string; courseId?: string; qt?: string; qs?: string }
  | { type: 'invite' }
  | null;

const MUST_CHANGE_KEY = 'org:mustChangePassword';

/** Try to read 'auth:returnTo' from AsyncStorage if present (best-effort/no hard dep) */
async function getRawReturnTo(): Promise<string> {
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    const v = await mod.default.getItem('auth:returnTo');
    return v || '';
  } catch {
    return '';
  }
}

/** Try to read must-change-password flag (same key as web: org:mustChangePassword) */
async function readMustChangePasswordNative(): Promise<boolean> {
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    const v = await mod.default.getItem(MUST_CHANGE_KEY);
    return v === '1';
  } catch {
    return false;
  }
}

/** Parse a web-style returnTo path into mobile navigation intent */
function parseReturnTo(saved: string | null | undefined): PendingDeepLink {
  if (!saved) return null;
  if (/\/org\/join\//.test(saved)) return { type: 'invite' };

  // very light query parse for assignment hints
  const qs = saved.split('?')[1] || '';
  const parts = new URLSearchParams(qs);
  const assignmentId = parts.get('assignmentId') || undefined;
  const courseId = parts.get('courseId') || undefined;
  const qt = parts.get('qt') || undefined;
  const qsSize = parts.get('qs') || undefined;

  if (assignmentId) return { type: 'robot', assignmentId, courseId, qt, qs: qsSize };
  return null;
}

export default function OrgHomeRouterNative() {
  const navigation = useNavigation<any>();
  const { orgToken } = useShopContext() as any;

  // useOrg shape can vary a bit, so cast loosely (like web version)
  const orgState = (useOrg?.() ?? {}) as any;
  const { org, role: rawRole, loading, isLoading } = orgState;

  const busy = typeof loading === 'boolean' ? loading : isLoading;
  const normalizedRole = (rawRole || '').toString().toLowerCase();
  const isLearner = normalizedRole === 'learner' || normalizedRole === 'student';
  const isInstructor = normalizedRole === 'instructor' || normalizedRole === 'teacher';
  const isOrgAdmin = normalizedRole === 'owner' || normalizedRole === 'admin';

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Not authenticated for org → go to institution login
      if (!orgToken) {
        if (!cancelled) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'InstitutionLogin', params: { next: 'OrgHome' } }],
          });
          setChecking(false);
        }
        return;
      }

      // Still resolving org + role → keep spinner
      if (busy) {
        return;
      }

      // Token exists but no org found → send to institution login to recover
      if (!org) {
        if (!cancelled) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'InstitutionLogin', params: { next: 'OrgHome' } }],
          });
          setChecking(false);
        }
        return;
      }

      // Read must-change flag + saved deep-link once
      const [mustChangePassword, saved] = await Promise.all([
        readMustChangePasswordNative(),
        getRawReturnTo(),
      ]);

      // 🔐 Force password change for learners & instructors on first login
      if (mustChangePassword && (isLearner || isInstructor)) {
        if (!cancelled) {
          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'OrgChangePassword',
                params: {
                  from: saved || 'OrgHome',
                },
              },
            ],
          });
          setChecking(false);
        }
        return;
      }

      // 🎓 Learners: respect saved deep-link (assignments / invites), else learner home
      if (isLearner) {
        const parsed = parseReturnTo(saved);

        if (!cancelled) {
          if (parsed?.type === 'robot') {
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: 'RobotTutor',
                  params: {
                    flow: 'org',
                    lock: '1',
                    ...(parsed.assignmentId ? { assignmentId: parsed.assignmentId } : {}),
                    ...(parsed.courseId ? { courseId: parsed.courseId } : {}),
                    ...(parsed.qt ? { qt: parsed.qt } : {}),
                    ...(parsed.qs ? { qs: parsed.qs } : {}),
                  },
                },
              ],
            });
          } else if (parsed?.type === 'invite') {
            // No dedicated native invite-landing: drop learner into home which can guide them.
            navigation.reset({
              index: 0,
              routes: [{ name: 'OrgLearnerHome' }],
            });
          } else {
            navigation.reset({
              index: 0,
              routes: [{ name: 'OrgLearnerHome' }],
            });
          }
          setChecking(false);
        }
        return;
      }

      // 👩‍🏫 Instructors → instructor home
      if (isInstructor) {
        if (!cancelled) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'OrgInstructorHome' }],
          });
          setChecking(false);
        }
        return;
      }

      // 👑 Owners / admins only → org profile (mobile equivalent of org portal)
      if (isOrgAdmin) {
        if (!cancelled) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'OrgProfile' }],
          });
          setChecking(false);
        }
        return;
      }

      // ❓ Any unknown / unsupported role → send them back to institution login to recover safely
      if (!cancelled) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'InstitutionLogin', params: { next: 'OrgHome' } }],
        });
        setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgToken, busy, org, isLearner, isInstructor, isOrgAdmin, navigation]);

  if (checking) {
    return (
      <View style={tw`flex-1 bg-[#0b1220] items-center justify-center`}>
        <ActivityIndicator />
        <Text style={tw`mt-2 text-white/70`}>
          Loading your institution portal…
        </Text>
      </View>
    );
  }

  // Should never render anything once routing is done
  return null;
}
