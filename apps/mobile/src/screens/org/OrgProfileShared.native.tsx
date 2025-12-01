/* eslint-disable prettier/prettier */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import tw from '../../../tailwind';
import { useThemePref } from '../../theme/ThemeContext';

/* ----------------------------- shared types ----------------------------- */

export type MiniUser = {
  id: string | number;
  name?: string;
  email?: string;

  // optional staff fields (instructors)
  staff_code?: string | null;

  // optional learner fields
  admission_code?: string | null;
  class_label?: string | null;
  guardian_email?: string | null;

  // last issued temp password (instructor or learner)
  temp_password?: string | null;
};

/* ----------------------------- shared helpers ----------------------------- */

const FALLBACK = (n = 'Org') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    n,
  )}&background=047857&color=ffffff`;

export const resolveAsset = (
  raw?: string,
  backendUrl?: string,
  fallbackName?: string,
) => {
  if (!raw) return FALLBACK(fallbackName ?? 'Org');
  if (raw.startsWith('/') && backendUrl) {
    return `${backendUrl.replace(/\/+$/, '')}${raw}`;
  }
  return raw;
};

export const getInitials = (name?: string, email?: string) => {
  const src = (name && name.trim()) || (email && email.split('@')[0]) || '';
  const parts = src.split(/\s+/).slice(0, 2);
  return (
    parts
      .map((p) => p[0]?.toUpperCase() || '')
      .join('') || '👤'
  );
};

/**
 * Native equivalent of tierBadge() — gives colors you can use for chips/badges.
 */
export const tierTone = (t?: string) => {
  const tier = (t || 'starter').toLowerCase();
  if (tier === 'enterprise') {
    return {
      bg: 'rgba(245, 158, 11, 0.15)',
      text: '#b45309',
      ring: 'rgba(245, 158, 11, 0.3)',
    };
  }
  if (tier === 'pro') {
    return {
      bg: 'rgba(79, 70, 229, 0.15)',
      text: '#4338ca',
      ring: 'rgba(79, 70, 229, 0.3)',
    };
  }
  return {
    bg: 'rgba(16, 185, 129, 0.15)',
    text: '#047857',
    ring: 'rgba(16, 185, 129, 0.3)',
  };
};

/**
 * Web `cardBase` is just a class string; in native we generally use your palette.surface()
 * from the screen. If you want a shared helper, you can treat this as a hint, but most
 * screens should keep using their local palette.surface() for layout.
 */

/* -------------------------- shared UI components ------------------------- */

export const Skeleton: React.FC<{ style?: any }> = ({ style }) => (
  <View
    style={[
      tw`rounded-xl`,
      { backgroundColor: 'rgba(148,163,184,0.16)' },
      style,
    ]}
  />
);

/**
 * Local palette hook for PersonRow only — keeps it visually consistent with
 * OrgProfile.native.tsx (dark/light aware, Tailwind spacing).
 */
function usePersonPalette() {
  const { resolvedScheme } = useThemePref();
  const isDark = resolvedScheme === 'dark';
  return {
    isDark,
    bg: isDark ? '#020617' : '#f8fafc',
    divider: isDark ? 'rgba(15,23,42,1)' : '#e7edf4',
    text: isDark ? '#e5f0ff' : '#0d141c',
    textMuted: isDark ? 'rgba(148,163,184,0.95)' : '#49739c',
    dangerBg: '#dc2626',
    monoText: {
      fontFamily: Platform.select({
        ios: 'Menlo',
        android: 'monospace',
        default: 'monospace',
      }),
    },
  };
}

export const PersonRow: React.FC<{
  u: MiniUser;
  onRemove?: () => Promise<void> | void;
}> = ({ u, onRemove }) => {
  const palette = usePersonPalette();
  const [removing, setRemoving] = useState(false);

  const label = u.name || u.email || `User #${u.id}`;
  const msg = `Hi${u.name ? ` ${u.name}` : ''}, I’d like to get in touch.`;

  const doRemove = async () => {
    if (!onRemove || removing) return;
    setRemoving(true);
    try {
      await onRemove();
    } finally {
      setRemoving(false);
    }
  };

  const openEmail = () => {
    if (!u.email) return;
    Linking.openURL(`mailto:${u.email}`).catch(() => {});
  };

  const openWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View
      style={[
        tw`flex-row items-center justify-between px-2 py-2 rounded-2xl`,
        { backgroundColor: 'transparent' },
      ]}
    >
      {/* Left: avatar + name */}
      <View style={tw`flex-row items-center gap-3 flex-1 min-w-0`}>
        <View
          style={[
            tw`h-9 w-9 rounded-full items-center justify-center`,
            {
              backgroundColor: palette.isDark
                ? 'rgba(148,163,184,0.16)'
                : '#f1f5f9',
            },
          ]}
        >
          <Text
            style={[
              tw`text-xs font-semibold`,
              { color: palette.text },
            ]}
          >
            {getInitials(u.name, u.email)}
          </Text>
        </View>

        <View style={tw`flex-1 min-w-0`}>
          <Text
            numberOfLines={1}
            style={[
              tw`text-sm font-medium`,
              { color: palette.text },
            ]}
          >
            {label}
          </Text>
          {!!u.email && (
            <Text
              numberOfLines={1}
              style={[
                tw`text-xs mt-0.5`,
                { color: palette.textMuted },
              ]}
            >
              {u.email}
            </Text>
          )}
        </View>
      </View>

      {/* Right: actions */}
      <View style={tw`flex-row items-center gap-1.5 ml-2`}>
        {!!u.email && (
          <>
            <TouchableOpacity
              onPress={openEmail}
              accessibilityRole="button"
              accessibilityLabel="Email"
              style={[
                tw`h-8 px-3 rounded-xl items-center justify-center`,
                { backgroundColor: palette.divider },
              ]}
            >
              <Text
                style={[
                  tw`text-xs font-semibold`,
                  { color: palette.text },
                ]}
              >
                Email
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openWhatsApp}
              accessibilityRole="button"
              accessibilityLabel="WhatsApp"
              style={[
                tw`h-8 px-3 rounded-xl items-center justify-center`,
                { backgroundColor: palette.divider },
              ]}
            >
              <Text
                style={[
                  tw`text-xs font-semibold`,
                  { color: palette.text },
                ]}
              >
                WhatsApp
              </Text>
            </TouchableOpacity>
          </>
        )}

        {onRemove && (
          <TouchableOpacity
            disabled={removing}
            onPress={doRemove}
            accessibilityRole="button"
            accessibilityLabel="Remove from organization"
            style={[
              tw`h-8 px-3 rounded-xl items-center justify-center`,
              { backgroundColor: palette.dangerBg },
            ]}
          >
            <Text
              style={tw`text-xs font-semibold text-white`}
            >
              {removing ? 'Removing…' : 'Remove'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
