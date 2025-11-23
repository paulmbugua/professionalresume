/* eslint-disable prettier/prettier */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Linking,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
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
import { getMyOrgOrBootstrap, getOrgUsage } from '@mytutorapp/shared/api';
import {
  getOrgRoster as apiRoster,
  createOrgMembershipInvite,
  removeOrgMember,
} from '@mytutorapp/shared/api/orgApi';
import ThemeToggle from '../ThemeToggle.native';
import { useThemePref } from '../../theme/ThemeContext';

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

/* ---------------- theming ---------------- */
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
    dashed: isDark ? 'rgba(148,163,184,0.45)' : '#cedbe8',
    text: isDark ? '#e5f0ff' : '#0d141c',
    textMuted: isDark ? 'rgba(148,163,184,0.95)' : '#49739c',
    textSubtle: isDark ? 'rgba(148,163,184,0.85)' : 'rgba(73,115,156,0.75)',
    chipBg: (_c: string) => (isDark ? `${_c}24` : '#e7edf4'),
    chipDot: (c: string) => c,
    surface(style?: any) {
      return [
        tw`rounded-3xl p-5`,
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
        tw`rounded-2xl p-4`,
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
        tw`rounded-3xl p-5`,
        {
          backgroundColor: this.softCard,
          borderColor: this.border,
          borderWidth: 1,
        },
        style,
      ];
    },
    input() {
      return [
        tw`px-3 py-2 rounded-xl text-sm`,
        {
          backgroundColor: this.bg,
          borderColor: this.border,
          borderWidth: 1,
          color: this.text,
        },
      ];
    },
    button(kind: 'primary' | 'neutral' | 'danger' = 'primary') {
      if (kind === 'primary') {
        return tw`h-10 px-4 rounded-xl bg-emerald-600 items-center justify-center`;
      }
      if (kind === 'danger') {
        return tw`h-10 px-4 rounded-xl bg-rose-600 items-center justify-center`;
      }
      return [
        tw`h-10 px-4 rounded-xl items-center justify-center`,
        { backgroundColor: this.divider },
      ];
    },
  };
}

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
      if (r.ok) return await r.json();
    } catch {
      // ignore
    }
  }
  return { instructors: [] as MiniUser[], learners: [] as MiniUser[] };
}

const FALLBACK = (n = 'Org') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    n,
  )}&background=047857&color=ffffff`;

const resolveAsset = (raw?: string, backendUrl?: string, fallbackName?: string) => {
  if (!raw) return FALLBACK(fallbackName ?? 'Org');
  if (raw.startsWith('/') && backendUrl) {
    return `${backendUrl.replace(/\/+$/, '')}${raw}`;
  }
  return raw;
};

const getInitials = (name?: string, email?: string) => {
  const src = (name && name.trim()) || (email && email.split('@')[0]) || '';
  const parts = src.split(/\s+/).slice(0, 2);
  return (
    parts
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') || '👤'
  );
};

const tierTone = (t?: string) => {
  const tier = (t || 'starter').toLowerCase();
  if (tier === 'enterprise') return { color: '#f59e0b', label: 'Enterprise' };
  if (tier === 'pro') return { color: '#6366f1', label: 'Pro' };
  return { color: '#10b981', label: 'Starter' };
};

/* ---------------- micro UI ---------------- */
const Skeleton: React.FC<{ style?: any }> = ({ style }) => (
  <View
    style={[
      tw`rounded-xl`,
      { backgroundColor: 'rgba(148,163,184,0.16)' },
      style,
    ]}
  />
);

const StatCard: React.FC<{
  label: string;
  value: string;
  palette: ReturnType<typeof usePalette>;
}> = ({ label, value, palette }) => (
  <View style={palette.smallSurface()}>
    <Text style={[tw`text-[10px]`, { color: palette.textMuted }]}>{label}</Text>
    <Text
      style={[
        tw`text-2xl font-extrabold mt-1`,
        { color: palette.text, letterSpacing: 0.2 },
      ]}
    >
      {value}
    </Text>
  </View>
);

const ProgressBar: React.FC<{
  pct: number;
  palette: ReturnType<typeof usePalette>;
}> = ({ pct, palette }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const bar =
    clamped >= 90 ? '#ef4444' : clamped >= 70 ? '#f59e0b' : '#10b981';
  return (
    <View
      style={[
        tw`h-2 rounded-full mt-2 overflow-hidden`,
        { backgroundColor: palette.divider },
      ]}
    >
      <View
        style={[
          tw`h-2 rounded-full`,
          { width: `${clamped}%`, backgroundColor: bar },
        ]}
      />
    </View>
  );
};

const PersonRow: React.FC<{
  u: MiniUser;
  palette: ReturnType<typeof usePalette>;
  onRemove?: () => Promise<void> | void;
}> = ({ u, palette, onRemove }) => {
  const emailHref = u.email ? `mailto:${u.email}` : null;
  const waText = `Hi${u.name ? ` ${u.name}` : ''}, I’d like to get in touch.`;

  const openEmail = () => {
    if (emailHref) Linking.openURL(emailHref).catch(() => {});
  };
  const openWhatsApp = () =>
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(waText)}`).catch(
      () => {},
    );

  const [removing, setRemoving] = useState(false);
  const doRemove = () => {
    if (!onRemove || removing) return;
    Alert.alert(
      'Remove member',
      `${u.name || u.email || `User #${u.id}`} will lose access to this portal.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setRemoving(true);
              await onRemove();
            } finally {
              setRemoving(false);
            }
          },
        },
      ],
    );
  };

  const iconBtn = [
    tw`h-8 w-8 mr-1.5 rounded-xl items-center justify-center`,
    { backgroundColor: palette.divider },
  ];
  const removeBtn = [
    tw`h-8 w-8 rounded-xl items-center justify-center`,
    { backgroundColor: '#dc2626' },
  ];

  return (
    <View style={tw`flex-row items-center justify-between px-2 py-2 rounded-2xl`}>
      <View style={tw`flex-row items-center gap-3 flex-1 min-w-0`}>
        <View
          style={[
            tw`h-9 w-9 rounded-2xl items-center justify-center`,
            { backgroundColor: palette.divider },
          ]}
        >
          <Text style={[tw`text-xs`, { color: palette.text }]}>
            {getInitials(u.name, u.email)}
          </Text>
        </View>
        <View style={tw`flex-1 min-w-0`}>
          <Text
            numberOfLines={1}
            style={[tw`font-medium`, { color: palette.text }]}
          >
            {u.name || u.email || `User #${u.id}`}
          </Text>
          {!!u.email && (
            <Text
              numberOfLines={1}
              style={[tw`text-xs`, { color: palette.textMuted }]}
            >
              {u.email}
            </Text>
          )}
        </View>
      </View>

      <View style={tw`flex-row items-center`}>
        {!!u.email && (
          <>
            <TouchableOpacity
              onPress={openEmail}
              style={iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Email user"
            >
              <Ionicons name="mail-outline" size={18} color={palette.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openWhatsApp}
              style={iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Open WhatsApp"
            >
              <Ionicons name="logo-whatsapp" size={18} color={palette.text} />
            </TouchableOpacity>
          </>
        )}
        {onRemove && (
          <TouchableOpacity
            onPress={doRemove}
            disabled={removing}
            style={removeBtn}
            accessibilityRole="button"
            accessibilityLabel="Remove from organization"
          >
            <Ionicons name="close" size={18} color="#ffffff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

/* press feedback for CTAs */
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

/* ---------------- invite modal (native) ---------------- */
const InviteSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreate: (
    role: 'instructor' | 'learner',
    email?: string,
  ) => Promise<{ url: string } | void>;
  palette: ReturnType<typeof usePalette>;
  initialRole?: 'instructor' | 'learner';
}> = ({ open, onClose, onCreate, palette, initialRole = 'learner' }) => {
  const [role, setRole] = useState<'instructor' | 'learner'>(initialRole);
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!open) {
      setRole(initialRole);
      setEmail('');
      setUrl('');
      setCreating(false);
    }
  }, [open, initialRole]);

  const copy = async () => {
    if (url) {
      await Clipboard.setStringAsync(url);
      Alert.alert('Copied', 'Invite link copied');
    }
  };
  const emailShare = () =>
    Linking.openURL(
      `mailto:?subject=${encodeURIComponent(
        'You’re invited',
      )}&body=${encodeURIComponent(url)}`,
    ).catch(() => {});
  const waShare = () =>
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(url)}`).catch(
      () => {},
    );

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={tw`flex-1 items-center justify-center bg-black/40 p-3`}>
        <View
          style={[
            tw`w-full max-w-xl rounded-3xl p-4`,
            { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1 },
          ]}
        >
          <View style={tw`flex-row items-center justify-between`}>
            <Text
              style={[tw`text-lg font-bold`, { color: palette.text }]}
            >
              Create invite
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[
                tw`px-3 py-1.5 rounded-2xl`,
                { backgroundColor: palette.divider },
              ]}
            >
              <Text style={{ color: palette.text }}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={tw`mt-3`}>
            <Text
              style={[tw`text-xs mb-1`, { color: palette.textMuted }]}
            >
              Role
            </Text>
            <View style={tw`flex-row`}>
              {(['learner', 'instructor'] as const).map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRole(r)}
                  style={tw.style(
                    'px-3 py-2 rounded-2xl mr-2',
                    role === r ? 'bg-white/10' : 'bg-white/5',
                  )}
                >
                  <Text style={{ color: palette.text }}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={[tw`text-xs mt-3 mb-1`, { color: palette.textMuted }]}
            >
              Email (optional)
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.edu"
              placeholderTextColor={palette.textSubtle}
              style={palette.input()}
              autoCapitalize="none"
              keyboardType={Platform.select({
                ios: 'email-address',
                android: 'email-address',
                default: 'email-address',
              })}
            />

            {!url ? (
              <TouchableOpacity
                disabled={creating}
                onPress={async () => {
                  try {
                    setCreating(true);
                    const r = await onCreate(role, email || undefined);
                    if (r?.url) setUrl(r.url);
                  } catch (e: any) {
                    Alert.alert(
                      'Invite',
                      e?.message || 'Failed to create invite.',
                    );
                  } finally {
                    setCreating(false);
                  }
                }}
                style={[tw`mt-3`, palette.button('primary')]}
              >
                <Text style={tw`text-white font-semibold`}>
                  {creating ? 'Creating…' : 'Create invite'}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={tw`mt-3`}>
                <View
                  style={[
                    tw`rounded-2xl p-3`,
                    {
                      backgroundColor: palette.bg,
                      borderColor: palette.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text selectable style={{ color: palette.text }}>
                    {url}
                  </Text>
                </View>
                <View style={tw`mt-2 flex-row flex-wrap`}>
                  <TouchableOpacity
                    onPress={copy}
                    style={[
                      tw`px-3 py-2 rounded-2xl mr-2 mb-2`,
                      { backgroundColor: palette.divider },
                    ]}
                  >
                    <Text style={{ color: palette.text }}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={emailShare}
                    style={[
                      tw`px-3 py-2 rounded-2xl mr-2 mb-2`,
                      { backgroundColor: palette.divider },
                    ]}
                  >
                    <Text style={{ color: palette.text }}>Email</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={waShare}
                    style={[
                      tw`px-3 py-2 rounded-2xl mb-2`,
                      { backgroundColor: palette.divider },
                    ]}
                  >
                    <Text style={{ color: palette.text }}>WhatsApp</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ---------------- screen ---------------- */
const OrgProfileNative: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const palette = usePalette();

  const { backendUrl, orgToken, orgLogout } = useShopContext() as any;

  const [org, setOrg] = useState<Org | null>(null);
  const [seatsUsed, setSeatsUsed] = useState<number>(0);
  const [seatsMax, setSeatsMax] = useState<number>(50);
  const [loading, setLoading] = useState(true);
  const [instructors, setInstructors] = useState<MiniUser[]>([]);
  const [learners, setLearners] = useState<MiniUser[]>([]);

  // invite sheet state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] =
    useState<'instructor' | 'learner'>('learner');

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
      if (!orgToken) {
        setLoading(false);
        return;
      }
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

        // Prefer official API; fall back to heuristic
        try {
          const roster = await apiRoster(backendUrl, orgToken, o.id);
          if (!stop) {
            setInstructors(
              Array.isArray(roster?.instructors) ? roster.instructors : [],
            );
            setLearners(
              Array.isArray(roster?.learners) ? roster.learners : [],
            );
          }
        } catch {
          try {
            const roster = await tryFetchRoster(backendUrl, orgToken, o.id);
            if (!stop) {
              setInstructors(
                Array.isArray(roster?.instructors) ? roster.instructors : [],
              );
              setLearners(
                Array.isArray(roster?.learners) ? roster.learners : [],
              );
            }
          } catch {
            // ignore
          }
        }
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load organization.');
      } finally {
        if (!stop) setLoading(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [backendUrl, orgToken, seatCap]);

  const logo = useMemo(
    () => resolveAsset(org?.logo_url, backendUrl, org?.name),
    [org?.logo_url, backendUrl, org?.name],
  );

  const seatPct = Math.min(
    100,
    Math.round(((seatsUsed || 0) / (seatsMax || 1)) * 100),
  );
  const tier = tierTone(org?.tier);

  const exitOrgMode = async () => {
    try {
      await AsyncStorage.multiRemove([
        'auth:mode',
        'auth:orgId',
        'auth:returnTo:org',
        'auth:returnTo', // parity with web
      ]);
    } catch {
      // ignore
    }
    navigation.replace('ProfileSelf');
  };

  // Full org logout (context + storage) → go to InstitutionLogin
  const logoutInstitution = async () => {
    try {
      await orgLogout?.();
      await AsyncStorage.multiRemove([
        'auth:mode',
        'auth:orgId',
        'auth:returnTo:org',
        'auth:returnTo',
        'orgToken',
        'auth:token',
      ]);
    } catch {
      // ignore
    }
    navigation.replace('InstitutionLogin', { logoutOrg: true });
  };

  // Create membership invite (normalize to {url})
  const handleCreateMembershipInvite = useCallback(
    async (role: 'instructor' | 'learner', email?: string) => {
      if (!org?.id) throw new Error('Organization is not loaded yet.');
      if (!orgToken)
        throw new Error('You are not authenticated for this organization.');
      const resp = (await createOrgMembershipInvite(
        backendUrl,
        orgToken,
        org.id,
        { role, email },
      )) as any;
      const url = resp?.invite_url;
      if (!url) throw new Error('Invite created but no URL was returned.');

      // best-effort roster refresh
      try {
        const roster = await apiRoster(backendUrl, orgToken, org.id);
        setInstructors(
          Array.isArray(roster?.instructors) ? roster.instructors : [],
        );
        setLearners(
          Array.isArray(roster?.learners) ? roster.learners : [],
        );
      } catch {
        // ignore
      }
      return { url };
    },
    [backendUrl, org?.id, orgToken],
  );

  // Remove member (optimistic updates)
  const handleRemoveMember = useCallback(
    async (u: MiniUser) => {
      if (!org?.id || !orgToken) return;
      try {
        await removeOrgMember(backendUrl, orgToken, org.id, u.id);

        // Optimistic UI updates
        setInstructors((prev) =>
          prev.filter((x) => String(x.id) !== String(u.id)),
        );
        const wasLearner = learners.some(
          (x) => String(x.id) === String(u.id),
        );
        setLearners((prev) =>
          prev.filter((x) => String(x.id) !== String(u.id)),
        );
        if (wasLearner)
          setSeatsUsed((s) => Math.max(0, (s || 0) - 1));
      } catch (e: any) {
        const msg =
          e?.response?.data?.message ||
          e?.message ||
          'Failed to remove member.';
        Alert.alert('Remove member', msg);
      }
    },
    [backendUrl, org?.id, orgToken, learners],
  );

  // press feedback
  const portalBtn = usePressScale();
  const exitBtn = usePressScale();
  const logoutBtn = usePressScale();

  const bottomPad = Math.max(24, insets.bottom + 24);

  /* ---------------- render ---------------- */

  if (!orgToken) {
    return (
      <SafeAreaView
        style={[tw`flex-1`, { backgroundColor: palette.card }]}
        edges={['top', 'left', 'right', 'bottom']}
      >
        <View style={tw`px-4 pt-3 pb-1 flex-row justify-end`}>
          <ThemeToggle />
        </View>

        <View style={tw`flex-1 items-center justify-center p-6`}>
          <View style={palette.softSurface()}>
            <Text
              style={[tw`text-xl font-bold`, { color: palette.text }]}
            >
              Institution Profile
            </Text>
            <Text
              style={[tw`text-sm mt-2`, { color: palette.textMuted }]}
            >
              Please sign in as an institution to continue.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('InstitutionLogin')}
              style={tw`mt-4 h-10 px-4 rounded-xl bg-emerald-600 items-center justify-center`}
              accessibilityRole="button"
              accessibilityLabel="Open institution login"
            >
              <Text style={tw`text-white font-semibold`}>
                Institution Login
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[tw`flex-1`, { backgroundColor: palette.bg }]}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Animated.ScrollView
        contentContainerStyle={[tw`pb-0`, { paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        entering={FadeIn.duration(220)}
      >
        {/* Top bar */}
        <View style={tw`px-4 pt-3 pb-1 flex-row justify-end`}>
          <ThemeToggle />
        </View>

        {/* Header */}
        <View style={tw`px-4`}>
          <Animated.View entering={FadeInDown.duration(380)}>
            <View style={palette.surface()}>
              <View style={tw`flex-row items-start`}>
                {/* Left: Logo + Name */}
                <View style={tw`flex-row items-center flex-1 min-w-0`}>
                  {loading ? (
                    <Skeleton style={tw`h-16 w-16 rounded-2xl`} />
                  ) : (
                    <Image
                      source={{ uri: logo }}
                      style={[
                        tw`h-16 w-16 rounded-2xl`,
                        { backgroundColor: palette.divider },
                      ]}
                      contentFit="cover"
                      transition={250}
                      accessibilityLabel="Organization logo"
                    />
                  )}
                  <View style={tw`ml-3 flex-1 min-w-0`}>
                    <View
                      style={tw`flex-row items-center flex-wrap min-w-0`}
                    >
                      {loading ? (
                        <Skeleton style={tw`h-6 w-40 rounded`} />
                      ) : (
                        <Text
                          numberOfLines={1}
                          style={[
                            tw`text-[20px] font-extrabold`,
                            { color: palette.text },
                          ]}
                        >
                          {org?.name || 'Institution'}
                        </Text>
                      )}
                      {!loading && (
                        <View
                          style={[
                            tw`ml-2 px-2 py-0.5 rounded-full flex-row items-center`,
                            { backgroundColor: palette.chipBg(tier.color) },
                          ]}
                        >
                          <View
                            style={[
                              tw`h-1.5 w-1.5 rounded-full mr-1`,
                              { backgroundColor: palette.chipDot(tier.color) },
                            ]}
                          />
                          <Text
                            style={[
                              tw`text-[10px] font-semibold`,
                              { color: palette.text },
                            ]}
                          >
                            {(org?.tier || 'starter').toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      numberOfLines={1}
                      style={[
                        tw`text-xs mt-0.5`,
                        { color: palette.textMuted },
                      ]}
                    >
                      {loading
                        ? ' '
                        : org?.slug
                        ? `@${org.slug}`
                        : '—'}
                    </Text>
                  </View>
                </View>

                {/* Right: actions */}
                <View style={tw`ml-3 items-end`}>
                  <Animated.View style={portalBtn.style}>
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('OrgElearnPortal', {
                        tab: 'branding',
                        from: 'profile',
                      })
                    }
                    onPressIn={portalBtn.onIn}
                    onPressOut={portalBtn.onOut}
                    style={tw`h-9 px-3 rounded-2xl bg-indigo-600 items-center justify-center flex-row`}
                    accessibilityRole="button"
                    accessibilityLabel="Open organization portal"
                  >
                    <Ionicons
                      name="play-circle-outline"
                      size={16}
                      color="#fff"
                    />
                    <Text
                      style={tw`text-white text-xs font-semibold ml-1`}
                    >
                      Portal
                    </Text>
                  </TouchableOpacity>
                </Animated.View>        

                  <Animated.View style={[exitBtn.style, tw`mt-2`]}>
                    <TouchableOpacity
                      onPress={exitOrgMode}
                      onPressIn={exitBtn.onIn}
                      onPressOut={exitBtn.onOut}
                      style={[
                        tw`h-8 px-3 rounded-2xl items-center justify-center flex-row`,
                        { backgroundColor: palette.divider },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Exit organization mode"
                    >
                      <Ionicons
                        name="swap-horizontal-outline"
                        size={14}
                        color={palette.text}
                      />
                      <Text
                        style={[
                          tw`text-[11px] font-medium ml-1`,
                          { color: palette.text },
                        ]}
                      >
                        Exit org
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>

              {/* Stats */}
              <View style={tw`mt-4 gap-3`}>
                <StatCard
                  label="Seats used"
                  value={
                    loading ? ' ' : `${seatsUsed}/${seatsMax}`
                  }
                  palette={palette}
                />
                <View style={palette.smallSurface()}>
                  <Text
                    style={[tw`text-[10px]`, { color: palette.textMuted }]}
                  >
                    Usage
                  </Text>
                  {loading ? (
                    <>
                      <Skeleton style={tw`h-6 w-24 mt-2 rounded`} />
                      <Skeleton style={tw`h-2 w-full mt-2 rounded`} />
                    </>
                  ) : (
                    <>
                      <Text
                        style={[
                          tw`text-2xl font-extrabold mt-1`,
                          { color: palette.text },
                        ]}
                      >
                        {seatPct}%
                      </Text>
                      <ProgressBar pct={seatPct} palette={palette} />
                    </>
                  )}
                </View>

                <View style={palette.smallSurface()}>
                  <Text
                    style={[tw`text-[10px]`, { color: palette.textMuted }]}
                  >
                    Plan
                  </Text>
                  <Text
                    style={[
                      tw`text-2xl font-extrabold mt-1`,
                      { color: palette.text },
                    ]}
                  >
                    {loading ? ' ' : (org?.tier || 'starter').toUpperCase()}
                  </Text>
                  {!loading && (
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('OrgElearnPortal', {
                          tab: 'branding',
                          from: 'profile',
                        })
                      }
                      style={[
                        tw`mt-2 h-8 px-3 rounded-2xl items-center justify-center`,
                        { backgroundColor: palette.divider },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="Manage plan in branding"
                    >
                      <Text
                        style={[
                          tw`text-[11px] font-semibold`,
                          { color: palette.text },
                        ]}
                      >
                        Manage plan
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* People */}
        <View style={tw`px-4 mt-4`}>
          {/* Instructors */}
          <Animated.View
            entering={FadeInDown.delay(60).duration(380)}
            style={palette.surface(tw`mb-4`)}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <Text
                style={[tw`text-lg font-bold`, { color: palette.text }]}
              >
                Instructors
              </Text>
              <View style={tw`flex-row items-center`}>
                <TouchableOpacity
                  onPress={() => {
                    setInviteRole('instructor');
                    setInviteOpen(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Invite instructor"
                >
                  <Text
                    style={[
                      tw`underline text-xs mr-3`,
                      { color: palette.textMuted },
                    ]}
                  >
                    Invite instructor
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('OrgElearnPortal', {
                      tab: 'assign',
                      from: 'profile',
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Assign courses in portal"
                >
                  <Text
                    style={[
                      tw`underline text-xs`,
                      { color: palette.textMuted },
                    ]}
                  >
                    Assign in portal
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <View style={tw`mt-3`}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    style={tw`h-10 w-full mb-2 rounded-2xl`}
                  />
                ))}
              </View>
            ) : instructors.length ? (
              <View style={tw`mt-3`}>
                {instructors.slice(0, 8).map((u) => (
                  <PersonRow
                    key={String(u.id)}
                    u={u}
                    palette={palette}
                    onRemove={() => handleRemoveMember(u)}
                  />
                ))}
                {instructors.length > 8 && (
                  <Text
                    style={[
                      tw`text-[10px] mt-2`,
                      { color: palette.textSubtle },
                    ]}
                  >
                    Showing 8 of {instructors.length}
                  </Text>
                )}
              </View>
            ) : (
              <View
                style={[
                  tw`mt-4 rounded-3xl p-6 items-center`,
                  {
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: palette.dashed,
                  },
                ]}
              >
                <Text style={tw`text-2xl`}>👩🏽‍🏫</Text>
                <Text
                  style={[tw`text-sm mt-2`, { color: palette.text }]}
                >
                  No instructors yet.
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Learners */}
          <Animated.View
            entering={FadeInDown.delay(120).duration(380)}
            style={palette.surface()}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <Text
                style={[tw`text-lg font-bold`, { color: palette.text }]}
              >
                Learners
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setInviteRole('learner');
                  setInviteOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Invite learner"
              >
                <Text
                  style={[
                    tw`underline text-xs`,
                    { color: palette.textMuted },
                  ]}
                >
                  Invite learners
                </Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={tw`mt-3`}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    style={tw`h-10 w-full mb-2 rounded-2xl`}
                  />
                ))}
              </View>
            ) : learners.length ? (
              <View style={tw`mt-3`}>
                {learners.slice(0, 12).map((u) => (
                  <PersonRow
                    key={String(u.id)}
                    u={u}
                    palette={palette}
                    onRemove={() => handleRemoveMember(u)}
                  />
                ))}
                {learners.length > 12 && (
                  <Text
                    style={[
                      tw`text-[10px] mt-2`,
                      { color: palette.textSubtle },
                    ]}
                  >
                    Showing 12 of {learners.length}
                  </Text>
                )}
              </View>
            ) : (
              <View
                style={[
                  tw`mt-4 rounded-3xl p-6 items-center`,
                  {
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: palette.dashed,
                  },
                ]}
              >
                <Text style={tw`text-2xl`}>🎓</Text>
                <Text
                  style={[tw`text-sm mt-2`, { color: palette.text }]}
                >
                  No learners yet.
                </Text>
              </View>
            )}
          </Animated.View>
        </View>

        {/* Branding */}
        <View style={tw`px-4 mt-4`}>
          <Animated.View
            entering={FadeInDown.delay(180).duration(380)}
            style={palette.surface()}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <Text
                style={[tw`text-lg font-bold`, { color: palette.text }]}
              >
                Branding
              </Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('OrgElearnPortal', {
                    tab: 'branding',
                    from: 'profile',
                  })
                }
                style={tw`h-8 px-3 rounded-2xl bg-emerald-600 items-center justify-center flex-row`}
                accessibilityRole="button"
                accessibilityLabel="Edit branding in portal"
              >
                <Ionicons
                  name="color-palette-outline"
                  size={14}
                  color="#fff"
                />
                <Text
                  style={tw`text-white text-xs font-semibold ml-1`}
                >
                  Edit
                </Text>
              </TouchableOpacity>
            </View>

            <View style={tw`mt-3`}>
              {/* Logo */}
              <View
                style={[
                  tw`rounded-2xl p-3 mb-2`,
                  {
                    backgroundColor: palette.divider,
                    borderColor: palette.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[tw`text-[10px]`, { color: palette.textMuted }]}
                >
                  Logo
                </Text>
                {loading ? (
                  <Skeleton
                    style={tw`h-20 w-20 mt-2 rounded-2xl`}
                  />
                ) : (
                  <Image
                    source={{
                      uri: resolveAsset(org?.logo_url, backendUrl),
                    }}
                    style={[
                      tw`h-20 w-20 mt-2 rounded-2xl`,
                      { backgroundColor: palette.bg },
                    ]}
                    contentFit="contain"
                    transition={220}
                  />
                )}
              </View>

              {/* Signature */}
              <View
                style={[
                  tw`rounded-2xl p-3 mb-2`,
                  {
                    backgroundColor: palette.divider,
                    borderColor: palette.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[tw`text-[10px]`, { color: palette.textMuted }]}
                >
                  Registrar Signature
                </Text>
                {loading ? (
                  <Skeleton
                    style={tw`h-16 w-40 mt-2 rounded-2xl`}
                  />
                ) : (
                  <Image
                    source={{
                      uri: resolveAsset(org?.signature_url, backendUrl),
                    }}
                    style={[
                      tw`h-16 mt-2 rounded-2xl`,
                      { backgroundColor: palette.bg },
                    ]}
                    contentFit="contain"
                    transition={220}
                  />
                )}
              </View>

              {/* Email domain */}
              <View
                style={[
                  tw`rounded-2xl p-3`,
                  {
                    backgroundColor: palette.divider,
                    borderColor: palette.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={[tw`text-[10px]`, { color: palette.textMuted }]}
                >
                  Email domain
                </Text>
                {loading ? (
                  <Skeleton
                    style={tw`h-5 w-40 mt-2 rounded-xl`}
                  />
                ) : (
                  <Text
                    style={[
                      tw`mt-1 text-xs`,
                      { color: palette.text },
                    ]}
                  >
                    {org?.email_domain?.trim() || 'Not restricted'}
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Quick actions - modern card */}
        <View style={tw`px-4 mt-4`}>
          <Animated.View
            entering={FadeInDown.delay(220).duration(380)}
            style={palette.softSurface()}
          >
            <View style={tw`flex-row items-center justify-between`}>
              <View>
                <Text
                  style={[
                    tw`text-lg font-bold`,
                    { color: palette.text },
                  ]}
                >
                  Quick actions
                </Text>
                <Text
                  style={[
                    tw`text-xs mt-1`,
                    { color: palette.textSubtle },
                  ]}
                >
                  Jump straight into your portal tools.
                </Text>
              </View>
              <View
                style={[
                  tw`px-2 py-1 rounded-full flex-row items-center`,
                  { backgroundColor: palette.divider },
                ]}
              >
                <View
                  style={[
                    tw`h-1.5 w-1.5 rounded-full mr-1`,
                    { backgroundColor: '#22c55e' },
                  ]}
                />
                <Text
                  style={[
                    tw`text-[10px] font-medium`,
                    { color: palette.textMuted },
                  ]}
                >
                  Live
                </Text>
              </View>
            </View>

            <View style={tw`mt-3 flex-row flex-wrap gap-2`}>
              {/* Open portal – narrower width */}
              <Animated.View style={[portalBtn.style, tw`flex-[0.7]`]}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('OrgElearnPortal', {
                      tab: 'branding',
                      from: 'profile',
                    })
                  }
                  onPressIn={portalBtn.onIn}
                  onPressOut={portalBtn.onOut}
                  style={tw`flex-row items-center justify-center h-10 px-3 rounded-2xl bg-indigo-600`}
                  accessibilityRole="button"
                  accessibilityLabel="Open portal"
                >
                  <Ionicons
                    name="grid-outline"
                    size={16}
                    color="#fff"
                  />
                  <Text
                    style={tw`ml-2 text-[11px] font-semibold text-white text-center flex-shrink`}
                  >
                    Open portal
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Create assignment – wider */}
              <View style={tw`flex-[1.3]`}>
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate('OrgElearnPortal', {
                      tab: 'assign',
                      from: 'profile',
                    })
                  }
                  style={tw`flex-row items-center justify-center h-11 px-4 rounded-2xl bg-transparent border border-indigo-500/50`}
                  accessibilityRole="button"
                  accessibilityLabel="Create assignment"
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={palette.text}
                  />
                  <Text
                    style={[
                      tw`ml-2 text-[11px] font-semibold text-center flex-shrink`,
                      { color: palette.text },
                    ]}
                  >
                    Create assignment
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Session + compact logout */}
        <View style={tw`px-4 mt-6 mb-4`}>
          <View style={tw`flex-row items-center justify-between`}>
            <View style={tw`flex-row items-center`}>
              <View
                style={[
                  tw`h-8 w-8 rounded-2xl items-center justify-center mr-2`,
                  { backgroundColor: palette.divider },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color={palette.text}
                />
              </View>
              <View>
                <Text
                  style={[
                    tw`text-[10px] font-semibold uppercase tracking-[1px]`,
                    { color: palette.textSubtle },
                  ]}
                >
                  Session
                </Text>
                <Text
                  style={[
                    tw`text-[11px] mt-0.5`,
                    { color: palette.textMuted },
                  ]}
                >
                  Signed in as institution admin
                </Text>
              </View>
            </View>

            <Animated.View style={logoutBtn.style}>
              <TouchableOpacity
                onPress={logoutInstitution}
                onPressIn={logoutBtn.onIn}
                onPressOut={logoutBtn.onOut}
                activeOpacity={0.9}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[
                  tw`h-8 px-3 rounded-full flex-row items-center justify-center`,
                  {
                    backgroundColor: palette.isDark
                      ? 'rgba(248,113,113,0.12)'
                      : '#fef2f2',
                    borderColor: '#fb7185',
                    borderWidth: 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Logout of institution account"
              >
                <Ionicons
                  name="log-out-outline"
                  size={16}
                  color="#fb7185"
                />
                <Text
                  style={[
                    tw`ml-1 text-[11px] font-semibold`,
                    { color: '#fb7185' },
                  ]}
                >
                  Logout
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Invite sheet */}
      <InviteSheet
        open={inviteOpen}
        initialRole={inviteRole}
        onClose={() => setInviteOpen(false)}
        onCreate={handleCreateMembershipInvite}
        palette={palette}
      />
    </SafeAreaView>
  );
};

export default OrgProfileNative;
