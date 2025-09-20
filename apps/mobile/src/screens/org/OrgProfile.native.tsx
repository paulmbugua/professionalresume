/* eslint-disable prettier/prettier */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import tw from '../../../tailwind';

import { useShopContext } from '@mytutorapp/shared/context';
import { getMyOrgOrBootstrap, getOrgUsage } from '@mytutorapp/shared/api';

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

const tierBadgeStyle = (t?: string) => {
  const tier = (t || 'starter').toLowerCase();
  if (tier === 'enterprise') return tw`bg-amber-500/20`;
  if (tier === 'pro') return tw`bg-indigo-500/20`;
  return tw`bg-emerald-500/20`;
};

/* ---------------- screens ---------------- */

const Skeleton: React.FC<{ style?: any }> = ({ style }) => (
  <View style={[tw`bg-white/10 rounded`, style, { overflow: 'hidden' }]}>
    <View style={tw`h-full w-full bg-white/10`} />
  </View>
);

const PersonRow: React.FC<{ u: MiniUser }> = ({ u }) => (
  <View style={tw`flex-row items-center justify-between px-2 py-2 rounded-xl`}>
    <View style={tw`flex-row items-center gap-3 flex-1`}>
      <View style={tw`h-9 w-9 rounded-full bg-white/10 items-center justify-center`}>
        <Text style={tw`text-xs text-white`}>{getInitials(u.name, u.email)}</Text>
      </View>
      <View style={tw`flex-1`}>
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
    {!!u.email && (
      <TouchableOpacity
        onPress={() => {}}
        style={tw`h-8 px-3 rounded-lg bg-white/10 items-center justify-center ml-2`}
      >
        <Text style={tw`text-xs text-white`}>Contact</Text>
      </TouchableOpacity>
    )}
  </View>
);

/* ---------------- screen ---------------- */

const OrgProfileNative: React.FC = () => {
  const navigation = useNavigation<any>();
  const { backendUrl, token, setToken } = useShopContext() as any;

  const [org, setOrg] = useState<Org | null>(null);
  const [seatsUsed, setSeatsUsed] = useState<number>(0);
  const [seatsMax, setSeatsMax] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<MiniUser[]>([]);
  const [learners, setLearners] = useState<MiniUser[]>([]);

  const seatCap = useCallback((tier?: string) => {
    switch ((tier || 'starter').toLowerCase()) {
      case 'enterprise':
        return 5000;
      case 'pro':
        return 500;
      default:
        return 50;
    }
  }, []);

  useEffect(() => {
    let stop = false;
    (async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const o = await getMyOrgOrBootstrap(backendUrl, token);
        if (stop) return;
        setOrg(o);
        const cap = seatCap(o?.tier);
        setSeatsMax(cap);
        try {
          const u = await getOrgUsage(backendUrl, token, o.id);
          if (!stop) setSeatsUsed(Number(u?.seats_used ?? 0));
        } catch {
          if (!stop) setSeatsUsed(Number(o?.seats_used ?? 0));
        }
        try {
          const roster = await tryFetchRoster(backendUrl, token, o.id);
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
    return () => {
      stop = true;
    };
  }, [backendUrl, token, seatCap]);

  const logo = useMemo(
    () => resolveAsset(org?.logo_url, backendUrl, org?.name),
    [org?.logo_url, backendUrl, org?.name]
  );

  const seatPct = Math.min(100, Math.round(((seatsUsed || 0) / (seatsMax || 1)) * 100));

  const exitOrgMode = async () => {
    try {
      await AsyncStorage.multiRemove(['auth:mode', 'auth:orgId', 'auth:returnTo:org']);
    } catch {}
    navigation.replace('ProfileMe'); // adjust route name to your profile screen
  };

  const logoutInstitution = async () => {
    try {
      await AsyncStorage.multiRemove(['auth:mode', 'auth:orgId', 'auth:token', 'auth:returnTo:org']);
    } catch {}
    try { setToken?.(''); } catch {}
    navigation.replace('InstitutionLogin', { logout: 1 });
  };

  if (!token) {
    return (
      <View style={tw`flex-1 bg-[#0f1821] items-center justify-center p-6`}>
        <View style={tw`w-full max-w-xl rounded-2xl bg-[#101a27] p-6`}>
          <Text style={tw`text-white text-xl font-bold`}>Institution Profile</Text>
          <Text style={tw`text-white/80 text-sm mt-2`}>
            Please sign in as an institution to continue.
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('InstitutionLogin')}
            style={tw`mt-4 h-10 px-4 rounded-xl bg-emerald-600 items-center justify-center`}
          >
            <Text style={tw`text-white font-semibold`}>Institution Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-[#0f1821]`}>
      <ScrollView contentContainerStyle={tw`pb-28`}>
        {/* Hero card */}
        <View style={tw`px-4 pt-8 pb-4`}>
          <View style={tw`rounded-2xl bg-[#0f1821] border border-white/10 p-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center`}>
                {loading ? (
                  <Skeleton style={tw`h-16 w-16 rounded-xl`} />
                ) : (
                  <Image
                    source={{ uri: logo }}
                    style={tw`h-16 w-16 rounded-xl`}
                    resizeMode="cover"
                  />
                )}
                <View style={tw`ml-3`}>
                  <View style={tw`flex-row items-center flex-wrap`}>
                    {loading ? (
                      <Skeleton style={tw`h-6 w-40 rounded`} />
                    ) : (
                      <Text style={tw`text-white text-2xl font-extrabold`} numberOfLines={1}>
                        {org?.name || 'Institution'}
                      </Text>
                    )}
                    {!loading && (
                      <View style={[tw`ml-2 px-2 py-0.5 rounded-full`, tierBadgeStyle(org?.tier)]}>
                        <Text style={tw`text-white text-2xs font-semibold`}>
                          {(org?.tier || 'starter').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={tw`text-white/70 text-sm mt-1`}>
                    {loading ? ' ' : org?.slug ? `@${org.slug}` : '—'}
                  </Text>
                </View>
              </View>

              {/* Actions */}
              <View style={tw`items-end`}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('OrgPortal')}
                  style={tw`h-10 px-4 rounded-xl bg-indigo-600 items-center justify-center mb-2`}
                >
                  <Text style={tw`text-white font-semibold`}>Open Portal</Text>
                </TouchableOpacity>
                <View style={tw`flex-row`}>
                  <TouchableOpacity
                    onPress={exitOrgMode}
                    style={tw`h-10 px-3 rounded-xl bg-white/10 items-center justify-center mr-2`}
                  >
                    <Text style={tw`text-white font-semibold`}>Exit org mode</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={logoutInstitution}
                    style={tw`h-10 px-3 rounded-xl bg-rose-600 items-center justify-center`}
                  >
                    <Text style={tw`text-white font-semibold`}>Logout</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Seats / Plan / Certificates */}
            <View style={tw`mt-4`}>
              {/* Seats */}
              <View style={tw`rounded-xl bg-white/5 p-3 mb-3`}>
                <Text style={tw`text-white/70 text-2xs`}>Seats used</Text>
                {loading ? (
                  <View>
                    <Skeleton style={tw`h-6 w-24 mt-2 rounded`} />
                    <Skeleton style={tw`h-2 w-full mt-2 rounded`} />
                  </View>
                ) : (
                  <>
                    <Text style={tw`text-white text-2xl font-extrabold mt-1`}>
                      {seatsUsed}/{seatsMax}
                    </Text>
                    <View style={tw`h-2 rounded-full bg-white/10 mt-2`}>
                      <View
                        style={[
                          tw`h-2 rounded-full`,
                          { width: `${seatPct}%`, backgroundColor: seatPct >= 90 ? '#ef4444' : '#10b981' },
                        ]}
                      />
                    </View>
                  </>
                )}
              </View>

              {/* Plan */}
              <View style={tw`rounded-xl bg-white/5 p-3 mb-3`}>
                <Text style={tw`text-white/70 text-2xs`}>Plan</Text>
                {loading ? (
                  <Skeleton style={tw`h-6 w-20 mt-2 rounded`} />
                ) : (
                  <View style={tw`mt-1 flex-row items-center justify-between`}>
                    <Text style={tw`text-white text-2xl font-extrabold`}>
                      {(org?.tier || 'starter').toUpperCase()}
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('OrgPortal')}
                      style={tw`h-8 px-3 rounded-lg bg-white/10 items-center justify-center`}
                    >
                      <Text style={tw`text-white text-sm font-semibold`}>Manage plan</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Certificates */}
              <View style={tw`rounded-xl bg-white/5 p-3`}>
                <Text style={tw`text-white/70 text-2xs`}>Certificates</Text>
                {loading ? (
                  <Skeleton style={tw`h-5 w-48 mt-2 rounded`} />
                ) : (
                  <>
                    <Text style={tw`text-white font-semibold mt-1`}>
                      {org?.certificate_title || 'Certificate of Completion'}
                    </Text>
                    <Text style={tw`text-white/60 text-2xs mt-1`}>
                      Signature & pass marks in Branding.
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* People */}
        <View style={tw`px-4`}>
          {/* Instructors */}
          <View style={tw`rounded-2xl border border-white/10 p-4 mb-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-white text-lg font-bold`}>Instructors</Text>
              <TouchableOpacity onPress={() => navigation.navigate('OrgPortal')}>
                <Text style={tw`text-white/90 underline`}>Assign courses →</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={tw`mt-3`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} style={tw`h-10 w-full mb-2 rounded`} />
                ))}
              </View>
            ) : instructors.length ? (
              <View style={tw`mt-3`}>
                {instructors.slice(0, 8).map(u => (
                  <PersonRow key={String(u.id)} u={u} />
                ))}
                {instructors.length > 8 && (
                  <Text style={tw`text-white/60 text-2xs mt-2`}>
                    Showing 8 of {instructors.length}
                  </Text>
                )}
              </View>
            ) : (
              <View style={tw`mt-4 border border-dashed border-white/10 rounded-xl p-6 items-center`}>
                <Text style={tw`text-2xl`}>👩🏽‍🏫</Text>
                <Text style={tw`text-white/90 text-sm mt-2`}>No instructors listed yet.</Text>
                <Text style={tw`text-white/60 text-2xs`}>Invite or assign from the portal.</Text>
              </View>
            )}
          </View>

          {/* Learners */}
          <View style={tw`rounded-2xl border border-white/10 p-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-white text-lg font-bold`}>Learners</Text>
              <TouchableOpacity onPress={() => navigation.navigate('OrgPortal')}>
                <Text style={tw`text-white/90 underline`}>Invite learners →</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={tw`mt-3`}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} style={tw`h-10 w-full mb-2 rounded`} />
                ))}
              </View>
            ) : learners.length ? (
              <View style={tw`mt-3`}>
                {learners.slice(0, 12).map(u => (
                  <PersonRow key={String(u.id)} u={u} />
                ))}
                {learners.length > 12 && (
                  <Text style={tw`text-white/60 text-2xs mt-2`}>
                    Showing 12 of {learners.length}
                  </Text>
                )}
              </View>
            ) : (
              <View style={tw`mt-4 border border-dashed border-white/10 rounded-xl p-6 items-center`}>
                <Text style={tw`text-2xl`}>🎓</Text>
                <Text style={tw`text-white/90 text-sm mt-2`}>No learners yet.</Text>
                <Text style={tw`text-white/60 text-2xs`}>Share your invite link from the portal.</Text>
              </View>
            )}
          </View>
        </View>

        {/* Branding */}
        <View style={tw`px-4 mt-4`}>
          <View style={tw`rounded-2xl border border-white/10 p-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <Text style={tw`text-white text-lg font-bold`}>Branding</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('OrgPortal')}
                style={tw`h-9 px-3 rounded-lg bg-emerald-600 items-center justify-center`}
              >
                <Text style={tw`text-white text-sm font-semibold`}>Edit Branding</Text>
              </TouchableOpacity>
            </View>

            <View style={tw`mt-4`}>
              {/* Logo */}
              <View style={tw`rounded-xl p-3 bg-white/5 mb-3`}>
                <Text style={tw`text-white/70 text-2xs`}>Logo</Text>
                {loading ? (
                  <Skeleton style={tw`h-24 w-24 mt-2 rounded-lg`} />
                ) : (
                  <Image
                    source={{ uri: resolveAsset(org?.logo_url, backendUrl) }}
                    style={tw`h-24 w-24 mt-2 rounded-lg`}
                    resizeMode="contain"
                  />
                )}
              </View>
              {/* Signature */}
              <View style={tw`rounded-xl p-3 bg-white/5 mb-3`}>
                <Text style={tw`text-white/70 text-2xs`}>Registrar Signature</Text>
                {loading ? (
                  <Skeleton style={tw`h-24 w-40 mt-2 rounded-lg`} />
                ) : (
                  <Image
                    source={{ uri: resolveAsset(org?.signature_url, backendUrl) }}
                    style={tw`h-24 mt-2 rounded-lg`}
                    resizeMode="contain"
                  />
                )}
              </View>
              {/* Email domain */}
              <View style={tw`rounded-xl p-3 bg-white/5`}>
                <Text style={tw`text-white/70 text-2xs`}>Email domain</Text>
                {loading ? (
                  <Skeleton style={tw`h-6 w-40 mt-2 rounded`} />
                ) : (
                  <Text style={tw`text-white mt-2`}>
                    {org?.email_domain?.trim() || 'Not restricted'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        {/* Quick actions */}
        <View style={tw`px-4 mt-4 flex-row`}>
          <TouchableOpacity
            onPress={() => navigation.navigate('OrgPortal')}
            style={tw`flex-1 h-10 mr-2 rounded-xl bg-indigo-600 items-center justify-center`}
          >
            <Text style={tw`text-white font-semibold`}>Open Portal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('OrgPortal')}
            style={tw`flex-1 h-10 ml-2 rounded-xl bg-white/10 items-center justify-center`}
          >
            <Text style={tw`text-white font-semibold`}>Create Assignment</Text>
          </TouchableOpacity>
        </View>

        {/* Loading overlay (optional) */}
        {loading && (
          <View style={tw`absolute inset-0 items-center justify-center`}>
            <ActivityIndicator />
          </View>
        )}
      </ScrollView>

      {/* Mobile sticky bar */}
      <View style={tw`absolute bottom-4 left-4 right-4`}>
        <TouchableOpacity
          onPress={() => navigation.navigate('OrgPortal')}
          style={tw`rounded-2xl shadow-lg border border-emerald-400/30 overflow-hidden`}
        >
          <View style={tw`py-3 items-center justify-center bg-emerald-600`}>
            <Text style={tw`text-white font-semibold`}>Manage in Portal</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={logoutInstitution}
          style={tw`mt-2 rounded-2xl py-3 items-center justify-center bg-rose-600`}
        >
          <Text style={tw`text-white font-semibold`}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OrgProfileNative;
