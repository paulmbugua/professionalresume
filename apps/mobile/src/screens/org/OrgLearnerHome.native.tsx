import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import tw from '../../../tailwind';
import { useShopContext } from '@mytutorapp/shared/context';
import { getMyOrgOrBootstrap } from '@mytutorapp/shared/api/orgApi';

type ParamList = {
  OrgLearnerHome: {
    assignmentId?: string | number;
    courseId?: string | number;
    qt?: 'mcq' | 'short';
    qs?: string | number;
  } | undefined;
};

export default function OrgLearnerHomeNative() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ParamList, 'OrgLearnerHome'>>();
  const { backendUrl, orgToken } = useShopContext() as any;

  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState<string | null>(null);
  const autoRanRef = useRef(false);

  const params = route.params ?? {};
  const hasAssignment = !!params.assignmentId;

  // Require org auth & load org meta
  useEffect(() => {
    if (!orgToken) {
      navigation.replace('OrgLogin', { next: 'OrgLearnerHome' });
      return;
    }
    let stop = false;
    (async () => {
      try {
        const org = await getMyOrgOrBootstrap(backendUrl, orgToken);
        if (!stop) setOrgName(org?.name ?? 'Your organization');
      } catch (e: any) {
        if (!stop) Alert.alert('Error', e?.message || 'Failed to load organization.');
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, [backendUrl, orgToken, navigation]);

  // Auto-redirect to RobotTutor if arriving with an invite/assignment
  useEffect(() => {
    if (!orgToken) return;
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
  }, [orgToken, hasAssignment, params, navigation]);

  const headerTitle = useMemo(
    () => (orgName ? `${orgName} · Learner` : 'Institution · Learner'),
    [orgName]
  );

  if (!orgToken || loading) {
    return (
      <View style={tw`flex-1 bg-[#0b1220] items-center justify-center`}>
        <ActivityIndicator />
        <Text style={tw`mt-2 text-white/70`}>Loading…</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-[#0b1220] p-4`}>
      <Text style={tw`text-white text-xl font-bold`}>{headerTitle}</Text>
      <Text style={tw`text-white/80 text-sm mt-1`}>
        Welcome! If you joined via an invite, we’ll take you straight into the assignment.
      </Text>

      <View style={tw`mt-4 rounded-2xl border border-white/10 bg-white/5 p-4`}>
        <Text style={tw`text-white font-semibold`}>Start learning</Text>
        <Text style={tw`text-white/70 text-sm mt-1`}>
          Jump into the Robot Tutor to study any topic or continue where you left off.
        </Text>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate('RobotTutor', {
              flow: 'org',
              lock: '1',
              ...(params.assignmentId ? { assignmentId: String(params.assignmentId) } : {}),
              ...(params.courseId ? { courseId: String(params.courseId) } : {}),
              ...(params.qt ? { qt: params.qt } : {}),
              ...(params.qs ? { qs: String(params.qs) } : {}),
            })
          }
          style={tw`mt-3 px-4 py-3 rounded-2xl bg-emerald-600 items-center`}
        >
          <Text style={tw`text-white font-semibold`}>Open Robot Tutor 🤖</Text>
        </TouchableOpacity>
      </View>

      <View style={tw`mt-3 rounded-2xl border border-white/10 bg-white/5 p-4`}>
        <Text style={tw`text-white font-semibold`}>Need help?</Text>
        <Text style={tw`text-white/70 text-sm mt-1`}>
          Your organization might set pass marks, timers, and attempts. Check the invite details from your admin if you’re unsure.
        </Text>
      </View>
    </View>
  );
}
