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

/** Try to read 'auth:returnTo' from AsyncStorage if present (best-effort/no hard dep) */
async function getPendingReturnTo(): Promise<string | null> {
  try {
    const mod = await import('@react-native-async-storage/async-storage');
    const v = await mod.default.getItem('auth:returnTo');
    return v || null;
  } catch {
    return null;
  }
}

/** Parse a web-style returnTo path into mobile navigation intent */
function parseReturnTo(saved: string | null): PendingDeepLink {
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
  const nav = useNavigation<any>();
  const { orgToken } = useShopContext() as any;
  const { role } = useOrg(); // 'owner' | 'admin' | 'instructor' | 'learner' | undefined

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // If not authenticated for org, send to org login
      if (!orgToken) {
        if (!cancelled) {
          nav.replace('OrgLogin', { next: 'OrgHome' });
          setChecking(false);
        }
        return;
      }

      // Resolve where to go by role
      if (role === 'learner') {
        // Try to honor a saved "returnTo" (e.g., from invite/assignment)
        const saved = await getPendingReturnTo();
        const parsed = parseReturnTo(saved);

        if (!cancelled) {
          if (parsed?.type === 'robot') {
            nav.replace('RobotTutor', {
              flow: 'org',
              lock: '1',
              ...(parsed.assignmentId ? { assignmentId: parsed.assignmentId } : {}),
              ...(parsed.courseId ? { courseId: parsed.courseId } : {}),
              ...(parsed.qt ? { qt: parsed.qt } : {}),
              ...(parsed.qs ? { qs: parsed.qs } : {}),
            });
          } else if (parsed?.type === 'invite') {
            // No native invite-landing flow here—drop learner into their home which can guide them.
            nav.replace('OrgLearnerHome');
          } else {
            nav.replace('OrgLearnerHome');
          }
          setChecking(false);
        }
        return;
      }

      if (role === 'instructor') {
        if (!cancelled) {
          nav.replace('OrgInstructorHome');
          setChecking(false);
        }
        return;
      }

      // owner/admin/default → open org portal
      if (!cancelled) {
        nav.replace('OrgPortal');
        setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgToken, role, nav]);

  if (checking) {
    return (
      <View style={tw`flex-1 bg-[#0b1220] items-center justify-center`}>
        <ActivityIndicator />
        <Text style={tw`mt-2 text-white/70`}>Routing…</Text>
      </View>
    );
  }

  return null;
}
