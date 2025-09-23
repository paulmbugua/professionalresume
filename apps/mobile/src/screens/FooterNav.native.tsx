// apps/mobile/src/components/FooterNav.native.tsx
import React, { FC, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import tw from '../../tailwind';
import { useThemePref } from '../theme/ThemeContext';
import { useShopContext } from '@mytutorapp/shared/context';

type Props = {
  aiRouteName?: string;       // default: 'RobotTutor'
  homeRouteName?: string;     // default: 'Home'
  profileRouteName?: string;  // default: 'ProfileSelf'
};

const ICON_SIZE = 20;
const BTN_H = 46;
const isAndroid = Platform.OS === 'android';
// Adjustable icon gap (px)
const ICON_GAP = 90;

function getActiveRouteName(state: any): string {
  try {
    if (!state) return '';
    let s = state;
    while (s && s.routes && typeof s.index === 'number') {
      const r = s.routes[s.index];
      if (!r) break;
      if (r.state) { s = r.state; continue; }
      return r.name || '';
    }
  } catch {}
  return '';
}

const FooterNav: FC<Props> = ({
  aiRouteName = 'RobotTutor',
  homeRouteName = 'Home',
  profileRouteName = 'ProfileSelf',
}) => {
  const navigation = useNavigation<any>();
  const [active, setActive] = useState<string>('');
  const { resolvedScheme } = useThemePref();
  const isDark = resolvedScheme === 'dark';
  const { token } = (useShopContext() as any) ?? {};

  useEffect(() => {
    try {
      const state = navigation.getState?.();
      setActive(getActiveRouteName(state));
    } catch {}
    const unsub = navigation.addListener?.('state', () => {
      try {
        const state = navigation.getState?.();
        setActive(getActiveRouteName(state));
      } catch {}
    });
    return () => { if (typeof unsub === 'function') unsub(); };
  }, [navigation]);

  const go = (name: string) => navigation.navigate(name as never);
  const isActive = (name: string) => active === name;
  const Dot = () => <View style={tw`w-1.5 h-1.5 rounded-full bg-primary mt-1`} />;

  // Theme-aware icon colors
  const baseIcon = isDark ? '#e5e7eb' /* slate-200 */ : '#111827' /* gray-900 */;
  const aiActiveIcon = isDark ? '#c7d2fe' /* indigo-200 */ : '#3730a3' /* indigo-800 */;
  const homeActiveIcon = '#ffffff';
  const profileActiveIcon = isDark ? '#a7f3d0' /* emerald-200 */ : '#065f46' /* emerald-900 */;

  // Decide what "Home" means depending on auth, and reset stack to avoid back-bouncing
  const goHome = React.useCallback(() => {
    const target = token ? homeRouteName : 'Landing';
    navigation.reset({
      index: 0,
      routes: [{ name: target as never }],
    });
  }, [navigation, token, homeRouteName]);

  // Active state should follow the effective home target
  const homeIsActive = isActive(token ? homeRouteName : 'Landing');

  // Reusable round button
  const RoundBtn: FC<{
    onPress: () => void;
    bgClassActive: string;
    bgClassInactive?: string;
    borderInactive?: string;
    iconName: React.ComponentProps<typeof FontAwesome>['name'];
    iconColor: string;
    active?: boolean;
    label: string;
  }> = ({
    onPress,
    bgClassActive,
    bgClassInactive = 'bg-gray-100 dark:bg-[#172534]',
    borderInactive = 'border border-gray-200/70 dark:border-white/10',
    iconName,
    iconColor,
    active,
    label,
  }) => (
    <View style={[tw`items-center`, { marginHorizontal: ICON_GAP / 2 }]}>
      <TouchableOpacity
        onPress={onPress}
        accessibilityLabel={label}
        style={tw.style(
          `h-[${BTN_H}px] w-[${BTN_H}px] rounded-full items-center justify-center`,
          active ? bgClassActive : [bgClassInactive, borderInactive],
          isAndroid ? 'shadow-lg' : 'shadow-lg'
        )}
      >
        <FontAwesome name={iconName} size={ICON_SIZE} color={iconColor} />
      </TouchableOpacity>
      <Text style={tw`mt-1 text-[11px] text-gray-700 dark:text-white/90`}>{label}</Text>
      {active && <Dot />}
    </View>
  );

  return (
    <SafeAreaView
      edges={['bottom']}
      style={tw`bg-white/75 dark:bg-[#0b121a]/75 border-t border-gray-200 dark:border-white/10`}
    >
      {/* spacer to reserve footer height */}
      <View style={tw`h-12`} />

      {/* Floating row: AI — Home — Profile (same vertical position) */}
      <View style={tw`absolute left-0 right-0 -top-6 items-center`}>
        <View style={tw`flex-row items-center justify-center`}>
          {/* AI */}
          <RoundBtn
            onPress={() => go(aiRouteName)}
            bgClassActive="bg-indigo-100 dark:bg-indigo-900/40"
            iconName="graduation-cap"
            iconColor={isActive(aiRouteName) ? aiActiveIcon : baseIcon}
            active={isActive(aiRouteName)}
            label="AI"
          />

          {/* Home (smart: Landing if logged out, Home if logged in) */}
          <RoundBtn
            onPress={goHome}
            bgClassActive="bg-primary"
            bgClassInactive="bg-primary"      // keep solid primary look
            borderInactive="border border-primary/80"
            iconName="home"
            iconColor={homeActiveIcon}
            active={homeIsActive}             // dot follows actual active route
            label="Home"
          />

          {/* Profile */}
          <RoundBtn
            onPress={() => go(profileRouteName)}
            bgClassActive="bg-emerald-100 dark:bg-emerald-900/40"
            iconName="user"
            iconColor={isActive(profileRouteName) ? profileActiveIcon : baseIcon}
            active={isActive(profileRouteName)}
            label="Profile"
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default FooterNav;
