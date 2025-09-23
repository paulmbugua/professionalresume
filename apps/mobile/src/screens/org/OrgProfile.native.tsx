/* eslint-disable prettier/prettier */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Image } from 'expo-image';
import tw from '../../../tailwind';

import { useShopContext } from '@mytutorapp/shared/context';
import { getMyOrgOrBootstrap, getOrgUsage } from '@mytutorapp/shared/api';

/* ---------------- types ---------------- */

type Org = {
  id: string;
  name?: string;
  slug?: string;
  logo_url?: string;
  signature_url?: string;
  certificate_title?: string;
  tier?: 'starter' | 'pro' | 'enterprise';
  seats_used?: number;
  owner_email?: string;
  email_domain?: string;
};

type MiniUser = { id: string | number; name?: string; email?: string };

/* ---------------- helpers ---------------- */

async function tryFetchRoster(backendUrl: string, token: string, orgId: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const base = backendUrl.replace(/\/+$/, '');
  const candidates = [
    `${base}/api/orgs/${orgId}/roster`,
    `${base}/api/organizations/${orgId}/roster`,
    `${base}/api/orgs/${orgId}/members`,
    `${base}/api/organizations/${orgId}/members`,
  ];
  for (const url of candidates) {
    try {
      const r = await fetch(url, { headers });
      if (r.ok) return await r.json(); // { instructors: MiniUser[], learners: MiniUser[] }
    } catch {}
  }
  return { instructors: [] as MiniUser[], learners: [] as MiniUser[] };
}

const FALLBACK = (n = 'Org') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=047857&color=ffffff`;

const resolveAsset = (raw?: string, backendUrl?: string, fallbackName?: string) => {
  if (!raw) return FALLBACK(fallbackName ?? 'Org');
  if (raw.startsWith('/') && backendUrl) return `${backendUrl.replace(/\/+$/, '')}${raw}`;
  return raw;
};

const getInitials = (name?: string, email?: string) => {
  const src = (name && name.trim()) || (email && email.split('@')[0]) || '';
  const parts = src.split(/\s+/).slice(0, 2);
  return parts.map(p => p[0]?.toUpperCase() || '').join('') || '👤';
};

const tierTone = (t?: string) => {
  const tier = (t || 'starter').toLowerCase();
  if (tier === 'enterprise') return { chip: 'bg-amber-500/15', dot: 'bg-amber-400' as const, label: 'Enterprise' };
  if (tier === 'pro')        return { chip: 'bg-indigo-500/15', dot: 'bg-indigo-400' as const, label: 'Pro' };
  return { chip: 'bg-emerald-500/15', dot: 'bg-emerald-400' as const, label: 'Starter' };
};

/* ---------------- micro UI ---------------- */

const Skeleton: React.FC<{ style?: any }> = ({ style }) => (
  <View style={[tw`bg-white/5 rounded`, style]} />
);

const StatCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={tw`rounded-2xl bg-[#0f1821] border border-white/5 p-4`}>
    <Text style={tw`text-white/70 text-2xs`}>{label}</Text>
    <Text style={tw`text-white text-2xl font-extrabold mt-1`}>{value}</Text>
  </View>
);

const ProgressBar: React.FC<{ pct: number }> = ({ pct }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const bar = clamped >= 90 ? '#ef4444' : clamped >= 70 ? '#f59e0b' : '#10b981';
  return (
    <View style={tw`h-2 rounded-full bg-white/10 mt-2 overflow-hidden`}>
      <View style={[tw`h-2 rounded-full`, { width: `${clamped}%`, backgroundColor: bar }]} />
    </View>
  );
};

const PersonRow: React.FC<{ u: MiniUser }> = ({ u }) => (
  <View style={tw`flex-row items-center justify-between px-2 py-2 rounded-xl`}>
    <View style={tw`flex-row items-center gap-3 flex-1 min-w-0`}>
      <View style={tw`h-9 w-9 rounded-full bg-white/10 items-center justify-center`}>
        <Text style={tw`text-xs text-white`}>{getInitials(u.name, u.email)}</Text>
      </View>
      <View style={tw`flex-1 min-w-0`}>
        <Text numberOfLines={1} style={tw`text-white font-medium`}>
          {u.name || u.email || `User #${u.id}`}
        </Text>
        {!!u.email && (
          <Text numberOfLines={1} style={tw`text-xs text-white/70`}>
            {u.email}
          </Text>
        )}
      </View>
    </View>
  </View>
);

/* press feedback for CTAs */
const usePressScale = () => {
  const s = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const onIn = () => { s.value = withSpring(0.98, { damping: 20, stiffness: 260 }); };
  const onOut = () => { s.value = withSpring(1, { damping: 16, stiffness: 200 }); };
  return { style, onIn, onOut };
};

/* ---------------- screen ---------------- */

const OrgProfileNative: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { backendUrl, orgToken, setOrgToken } = useShopContext() as any;

  const [org, setOrg] = useState<Org | null>(null);
  const [seatsUsed, setSeatsUsed] = useState<number>(0);
  const [seatsMax, setSeatsMax] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<MiniUser[]>([]);
  const [learners, setLearners] = useState<MiniUser[]>([]);

  const seatCap = useCallback((tier?: string) => {
    switch ((tier || 'starter').toLowerCase()) {
      case 'enterprise': return 5000;
      case 'pro':        return 500;
      default:           return 50;
    }
  }, []);

  useEffect(() => {
    let stop = false;
    (async () => {
      if (!orgToken) { setLoading(false); return; }
      try {
        const o = await getMyOrgOrBootstrap(backendUrl, orgToken);
        if (stop) return;
        setOrg(o);
        const cap = seatCap(o?.tier);
        setSeatsMax(cap);

        try {
          const u = await getOrgUsage(backendUrl, orgToken, o.id);
          if (!stop) setSeatsUsed(Number(u?.seats_used ?? 0));
        } catch {
          if (!stop) setSeatsUsed(Number(o?.seats_used ?? 0));
        }

        try {
          const roster = await tryFetchRoster(backendUrl, orgToken, o.id);
          if (!stop) {
            setInstructors(Array.isArray(roster?.instructors) ? roster.instructors : []);
            setLearners(Array.isArray(roster?.learners) ? roster.learners : []);
          }
        } catch {}
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load organization.');
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => { stop = true; };
  }, [backendUrl, orgToken, seatCap]);

  const logo = useMemo(
    () => resolveAsset(org?.logo_url, backendUrl, org?.name),
    [org?.logo_url, backendUrl, org?.name]
  );

  const seatPct = Math.min(100, Math.round(((seatsUsed || 0) / (seatsMax || 1)) * 100));
  const tones = tierTone(org?.tier);

  const exitOrgMode = async () => {
   // Leave orgToken intact; just exit the UI mode
   try {
     await AsyncStorage.multiRemove(['auth:mode', 'auth:orgId', 'auth:returnTo:org']);
   } catch {}
   navigation.replace('ProfileMe'); // or wherever you want to land
 };

  const logoutInstitution = async () => {
   // Full org logout: clear org mode + org returnTo; DO NOT touch user token
   try {
     await AsyncStorage.multiRemove(['auth:mode', 'auth:orgId', 'auth:returnTo:org']);
   } catch {}
   try {
     // This removes the persisted 'orgToken' via the context’s storage adapter
     await setOrgToken?.('');
   } catch {}
   navigation.replace('InstitutionLogin', { logout: 1 });
 };

  // press feedback
  const portalBtn = usePressScale();
  const exitBtn = usePressScale();
  const logoutBtn = usePressScale();

  // bottom safe padding for scroll content
  const bottomPad = Math.max(24, insets.bottom + 24);

  /* ---------------- render ---------------- */

  if (!orgToken) {
    return (
      <SafeAreaView style={tw`flex-1 bg-[#0f1821]`} edges={['top','left','right','bottom']}>
        <View style={tw`flex-1 items-center justify-center p-6`}>
          <View style={tw`w-full max-w-xl rounded-2xl bg-[#101a27] p-6 border border-white/10`}>
            <Text style={tw`text-white text-xl font-bold`}>Institution Profile</Text>
            <Text style={tw`text-white/80 text-sm mt-2`}>
              Please sign in as an institution to continue.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('InstitutionLogin')}
              style={tw`mt-4 h-10 px-4 rounded-xl bg-emerald-600 items-center justify-center`}
              accessibilityRole="button"
              accessibilityLabel="Open institution login"
            >
              <Text style={tw`text-white font-semibold`}>Institution Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-[#0b121a]`} edges={['top','left','right','bottom']}>
      <Animated.ScrollView
        contentContainerStyle={[tw`pb-0`, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        entering={FadeIn.duration(220)}
      >
        {/* Header / Identity */}
        <View style={tw`px-4 pt-3`}>
          <Animated.View entering={FadeInDown.duration(380)}>
            <View style={tw`rounded-3xl bg-[#0f1821] border border-white/5 p-5`}>
              <View style={tw`flex-row items-start`}>
                {/* Left: Logo + Name */}
                <View style={tw`flex-row items-center flex-1 min-w-0`}>
                  {loading ? (
                    <Skeleton style={tw`h-16 w-16 rounded-2xl`} />
                  ) : (
                    <Image
                      source={{ uri: logo }}
                      style={tw`h-16 w-16 rounded-2xl bg-white/5`}
                      contentFit="cover"
                      transition={250}
                      accessibilityLabel="Organization logo"
                    />
                  )}
                  <View style={tw`ml-3 flex-1 min-w-0`}>
                    <View style={tw`flex-row items-center flex-wrap min-w-0`}>
                      {loading ? (
                        <Skeleton style={tw`h-6 w-40 rounded`} />
                      ) : (
                        <Text
                          numberOfLines={1}
                          style={tw`text-white text-[20px] font-extrabold`}
                        >
                          {org?.name || 'Institution'}
                        </Text>
                      )}
                      {!loading && (
                        <View style={tw.style('ml-2 px-2 py-0.5 rounded-full flex-row items-center', tones.chip)}>
                          <View style={tw.style('h-1.5 w-1.5 rounded-full mr-1', tones.dot)} />
                          <Text style={tw`text-white text-2xs font-semibold`}>{(org?.tier || 'starter').toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                    <Text numberOfLines={1} style={tw`text-white/70 text-xs mt-0.5`}>
                      {loading ? ' ' : org?.slug ? `@${org.slug}` : '—'}
                    </Text>
                  </View>
                </View>

                {/* Right: minimal actions */}
                <View style={tw`ml-3`}>
                  <Animated.View style={portalBtn.style}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('OrgPortal')}
                      onPressIn={portalBtn.onIn}
                      onPressOut={portalBtn.onOut}
                      style={tw`h-9 px-3 rounded-xl bg-indigo-600 items-center justify-center`}
                      accessibilityRole="button"
                      accessibilityLabel="Open organization portal"
                    >
                      <Text style={tw`text-white text-sm font-semibold`}>Portal</Text>
                    </TouchableOpacity>
                  </Animated.View>
                  <Animated.View style={[exitBtn.style, tw`mt-2`]}>
                    <TouchableOpacity
                      onPress={exitOrgMode}
                      onPressIn={exitBtn.onIn}
                      onPressOut={exitBtn.onOut}
                      style={tw`h-9 px-3 rounded-xl bg-white/5 items-center justify-center`}
                      accessibilityRole="button"
                      accessibilityLabel="Exit organization mode"
                    >
                      <Text style={tw`text-white text-xs font-medium`}>Exit org mode</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>

              {/* Stats (minimal) */}
              <View style={tw`mt-4 gap-3`}>
                {/* Seats */}
                <View style={tw`rounded-2xl bg-[#0f1821] border border-white/5 p-4`}>
                  <Text style={tw`text-white/70 text-2xs`}>Seats used</Text>
                  {loading ? (
                    <>
                      <Skeleton style={tw`h-6 w-24 mt-2 rounded`} />
                      <Skeleton style={tw`h-2 w-full mt-2 rounded`} />
                    </>
                  ) : (
                    <>
                      <Text style={tw`text-white text-2xl font-extrabold mt-1`}>
                        {seatsUsed}/{seatsMax}
                      </Text>
                      <ProgressBar pct={seatPct} />
                    </>
                  )}
                </View>

                {/* Plan */}
                <StatCard label="Plan" value={loading ? ' ' : (org?.tier || 'starter').toUpperCase()} />

                {/* Certificates */}
                <View style={tw`rounded-2xl bg-[#0f1821] border border-white/5 p-4`}>
                  <Text style={tw`text-white/70 text-2xs`}>Certificates</Text>
                  {loading ? (
                    <Skeleton style={tw`h-5 w-48 mt-2 rounded`} />
                  ) : (
                    <>
                      <Text style={tw`text-white font-semibold mt-1`} numberOfLines={1}>
                        {org?.certificate_title || 'Certificate of Completion'}
                      </Text>
                      <Text style={tw`text-white/60 text-2xs mt-1`}>
                        Signature & pass marks are managed in Branding.
                      </Text>
                    </>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* People */}
        <View style={tw`px-4 mt-4`}>
          {/* Instructors */}
          <Animated.View entering={FadeInDown.delay(60).duration(380)} style={tw`rounded-3xl border border-white/5 p-5 mb-4 bg-[#0f1821]`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-white text-lg font-bold`}>Instructors</Text>
              <TouchableOpacity onPress={() => navigation.navigate('OrgPortal')} accessibilityRole="button" accessibilityLabel="Assign courses in portal">
                <Text style={tw`text-white/80 underline text-xs`}>Assign in portal</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={tw`mt-3`}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} style={tw`h-10 w-full mb-2 rounded-xl`} />
                ))}
              </View>
            ) : instructors.length ? (
              <View style={tw`mt-3`}>
                {instructors.slice(0, 6).map(u => (
                  <PersonRow key={String(u.id)} u={u} />
                ))}
                {instructors.length > 6 && (
                  <Text style={tw`text-white/60 text-2xs mt-2`}>
                    Showing 6 of {instructors.length}
                  </Text>
                )}
              </View>
            ) : (
              <View style={tw`mt-4 border border-dashed border-white/10 rounded-2xl p-6 items-center`}>
                <Text style={tw`text-2xl`}>👩🏽‍🏫</Text>
                <Text style={tw`text-white/90 text-sm mt-2`}>No instructors yet.</Text>
              </View>
            )}
          </Animated.View>

          {/* Learners */}
          <Animated.View entering={FadeInDown.delay(120).duration(380)} style={tw`rounded-3xl border border-white/5 p-5 bg-[#0f1821]`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-white text-lg font-bold`}>Learners</Text>
              <TouchableOpacity onPress={() => navigation.navigate('OrgPortal')} accessibilityRole="button" accessibilityLabel="Invite learners in portal">
                <Text style={tw`text-white/80 underline text-xs`}>Invite in portal</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={tw`mt-3`}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} style={tw`h-10 w-full mb-2 rounded-xl`} />
                ))}
              </View>
            ) : learners.length ? (
              <View style={tw`mt-3`}>
                {learners.slice(0, 8).map(u => (
                  <PersonRow key={String(u.id)} u={u} />
                ))}
                {learners.length > 8 && (
                  <Text style={tw`text-white/60 text-2xs mt-2`}>
                    Showing 8 of {learners.length}
                  </Text>
                )}
              </View>
            ) : (
              <View style={tw`mt-4 border border-dashed border-white/10 rounded-2xl p-6 items-center`}>
                <Text style={tw`text-2xl`}>🎓</Text>
                <Text style={tw`text-white/90 text-sm mt-2`}>No learners yet.</Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Branding (compact) */}
        <View style={tw`px-4 mt-4`}>
          <Animated.View entering={FadeInDown.delay(180).duration(380)} style={tw`rounded-3xl border border-white/5 p-5 bg-[#0f1821]`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-white text-lg font-bold`}>Branding</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('OrgPortal')}
                style={tw`h-8 px-3 rounded-lg bg-emerald-600 items-center justify-center`}
                accessibilityRole="button"
                accessibilityLabel="Edit branding in portal"
              >
                <Text style={tw`text-white text-xs font-semibold`}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={tw`mt-3`}>
              <View style={tw`rounded-xl p-3 bg-white/5 mb-2 border border-white/10`}>
                <Text style={tw`text-white/70 text-2xs`}>Logo</Text>
                {loading ? (
                  <Skeleton style={tw`h-20 w-20 mt-2 rounded-xl`} />
                ) : (
                  <Image
                    source={{ uri: resolveAsset(org?.logo_url, backendUrl) }}
                    style={tw`h-20 w-20 mt-2 rounded-xl bg-white/5`}
                    contentFit="contain"
                    transition={220}
                  />
                )}
              </View>
              <View style={tw`rounded-xl p-3 bg-white/5 mb-2 border border-white/10`}>
                <Text style={tw`text-white/70 text-2xs`}>Registrar Signature</Text>
                {loading ? (
                  <Skeleton style={tw`h-16 w-40 mt-2 rounded-xl`} />
                ) : (
                  <Image
                    source={{ uri: resolveAsset(org?.signature_url, backendUrl) }}
                    style={tw`h-16 mt-2 rounded-xl bg-white/5`}
                    contentFit="contain"
                    transition={220}
                  />
                )}
              </View>
              <View style={tw`rounded-xl p-3 bg-white/5 border border-white/10`}>
                <Text style={tw`text-white/70 text-2xs`}>Email domain</Text>
                {loading ? (
                  <Skeleton style={tw`h-5 w-40 mt-2 rounded`} />
                ) : (
                  <Text style={tw`text-white mt-1`}>
                    {org?.email_domain?.trim() || 'Not restricted'}
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>
        </View>

        {/* --- Centered Logout at the very end --- */}
        <View style={tw`px-4 mt-8 items-center`}>
          <Animated.View style={logoutBtn.style}>
            <TouchableOpacity
              onPress={logoutInstitution}
              onPressIn={logoutBtn.onIn}
              onPressOut={logoutBtn.onOut}
              style={tw`w-full max-w-[260px] h-11 rounded-2xl bg-rose-600 items-center justify-center`}
              accessibilityRole="button"
              accessibilityLabel="Logout of institution account"
            >
              <Text style={tw`text-white font-semibold`}>Logout</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default OrgProfileNative;
