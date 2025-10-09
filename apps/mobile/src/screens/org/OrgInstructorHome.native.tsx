import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Share, TextInput } from 'react-native';
import tw from '../../../tailwind';
import { useNavigation } from '@react-navigation/native';
import { useShopContext } from '@mytutorapp/shared/context';
import { getMyOrgOrBootstrap, getOrgUsage, createOrgAssignment } from '@mytutorapp/shared/api/orgApi';

export default function OrgInstructorHomeNative() {
  const navigation = useNavigation<any>();
  const { backendUrl, orgToken } = useShopContext() as any;

  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [tier, setTier] = useState<string>('starter');
  const [seatsUsed, setSeatsUsed] = useState<number>(0);
  const [seatsMax, setSeatsMax] = useState<number>(50);

  const [courseId, setCourseId] = useState<string>('');
  const [inviteUrl, setInviteUrl] = useState<string>('');

  // Require org auth & load org
  useEffect(() => {
    if (!orgToken) {
      navigation.replace('OrgLogin', { next: 'OrgInstructorHome' });
      return;
    }
    let stop = false;
    (async () => {
      try {
        const org = await getMyOrgOrBootstrap(backendUrl, orgToken);
        if (stop) return;
        setOrgName(org?.name ?? 'Your organization');
        setOrgId(org?.id ?? null);
        setTier((org?.tier || 'starter') as string);
        setSeatsMax(tierToSeatCap((org?.tier || 'starter') as string));
        try {
          const usage = await getOrgUsage(backendUrl, orgToken, org?.id);
          if (!stop) setSeatsUsed(Number(usage?.seats_used ?? 0));
        } catch {
          if (!stop) setSeatsUsed(Number(org?.seats_used ?? 0));
        }
      } catch (e: any) {
        if (!stop) Alert.alert('Error', e?.message || 'Failed to load organization.');
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, [backendUrl, orgToken, navigation]);

  const title = useMemo(
    () => (orgName ? `${orgName} · Instructor` : 'Institution · Instructor'),
    [orgName]
  );

  const seatPct = Math.min(100, Math.round(((seatsUsed || 0) / (seatsMax || 1)) * 100));

  const onCreateInvite = async () => {
    if (!orgId || !orgToken) return;
    if (!courseId.trim()) {
      Alert.alert('Missing', 'Enter a courseId to create an assignment invite.');
      return;
    }
    try {
      const resp: any = await createOrgAssignment(backendUrl, orgToken, orgId, {
        courseId,
        title_override: null,
        pass_mark: null,
        timer_s: null,
        due_at: null,
      } as any);
      const base = backendUrl.replace(/\/$/, '');
      const link = `${base}/org/join/${resp?.invite_code || resp?.inviteCode || resp?.code}`;
      setInviteUrl(link);
      try { await Share.share({ message: `You're invited to a course: ${link}` }); } catch {}
    } catch (e: any) {
      Alert.alert('Invite failed', e?.response?.data?.message || e?.message || 'Failed to create invite.');
    }
  };

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
      <Text style={tw`text-white text-xl font-bold`}>{title}</Text>
      <Text style={tw`text-white/80 text-sm mt-1`}>
        Create invites; your learners will be taken directly into the Robot Tutor after sign-in.
      </Text>

      {/* Plan & seats */}
      <View style={tw`mt-4 rounded-2xl border border-white/10 bg-white/5 p-4`}>
        <Text style={tw`text-white font-semibold`}>Plan & seats</Text>
        <Text style={tw`text-white/80 mt-1`}>
          Plan: <Text style={tw`text-white font-semibold`}>{tier.toUpperCase()}</Text>
        </Text>

        <View style={tw`mt-3 h-2 rounded bg-white/10 overflow-hidden`}>
          <View
            style={[
              tw`${seatPct >= 90 ? 'bg-red-400' : 'bg-emerald-400'}`,
              { width: `${seatPct}%`, height: '100%' },
            ]}
          />
        </View>
        <Text style={tw`text-white/80 mt-1`}>{seatsUsed}/{seatsMax} seats used</Text>
      </View>

      {/* Quick invite */}
      <View style={tw`mt-3 rounded-2xl border border-white/10 bg-white/5 p-4`}>
        <Text style={tw`text-white font-semibold`}>Quick invite</Text>
        <Text style={tw`text-white/70 text-sm mt-1`}>
          Enter a courseId to generate a magic link for your learners.
        </Text>

        <Text style={tw`text-white/80 text-xs mt-3`}>courseId</Text>
        <TextInput
          value={courseId}
          onChangeText={setCourseId}
          placeholder="COURSE_ID"
          placeholderTextColor="#9CA3AF"
          style={tw`mt-1 bg-[#0f1821] border border-white/10 rounded px-3 py-2 text-white`}
        />

        <TouchableOpacity onPress={onCreateInvite} style={tw`mt-3 px-4 py-3 rounded-2xl bg-emerald-600 items-center`}>
          <Text style={tw`text-white font-semibold`}>Create Invite Link</Text>
        </TouchableOpacity>

        {!!inviteUrl && (
          <>
            <Text selectable numberOfLines={2} style={tw`text-white mt-3`}>{inviteUrl}</Text>
            <TouchableOpacity
              onPress={async () => { try { await Share.share({ message: inviteUrl }); } catch {} }}
              style={tw`mt-2 px-3 py-2 rounded bg-indigo-600 self-start`}
            >
              <Text style={tw`text-white text-xs`}>Share / Copy</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Shortcuts */}
      <View style={tw`mt-3 flex-row`}>
        <TouchableOpacity
          onPress={() => navigation.navigate('RobotTutor', { flow: 'org' })}
          style={tw`flex-1 mr-2 px-4 py-3 rounded-2xl bg-indigo-600 items-center`}
        >
          <Text style={tw`text-white font-semibold`}>Create with AI 🤖</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('OrgPortal')}
          style={tw`flex-1 ml-2 px-4 py-3 rounded-2xl bg-sky-600 items-center`}
        >
          <Text style={tw`text-white font-semibold`}>Open Org Portal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* Helpers */
function tierToSeatCap(tier?: string): number {
  switch ((tier || 'starter').toLowerCase()) {
    case 'enterprise': return 5000;
    case 'pro': return 500;
    default: return 50;
  }
}
