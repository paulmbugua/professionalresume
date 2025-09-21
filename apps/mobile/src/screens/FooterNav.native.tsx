// apps/mobile/src/components/FooterNav.native.tsx
import React, { FC, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import tw from '../../tailwind';

type Props = {
  aiRouteName?: string;       // default: 'RobotTutor'
  homeRouteName?: string;     // default: 'Home'
  profileRouteName?: string;  // default: 'Account'
};

const ICON_SIZE = 20;
const BTN_H = 46; // slightly reduced from 50 to shrink footer a bit
const isAndroid = Platform.OS === 'android';

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

  return (
    <SafeAreaView
      edges={['bottom']}
      // semi-transparent footer
      style={tw`bg-white/75 dark:bg-[#0b121a]/75 border-t border-gray-200 dark:border-darkCard`}
    >
      {/* shorter spacer to reduce visual height, but keeps floating button clear */}
      <View style={tw`h-12`} />

      {/* FLOATING center Home button — unchanged behavior/positioning */}
      <View style={tw`absolute left-0 right-0 -top-6 items-center`}>
        <TouchableOpacity
          onPress={() => go(homeRouteName)}
          accessibilityLabel="Home"
          style={tw.style(
            `h-[${BTN_H}px] w-[${BTN_H}px] rounded-full items-center justify-center`,
            'bg-primary shadow-lg',
            'border border-primary/80'
          )}
        >
          <FontAwesome name="home" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Bottom row: AI (left) and Profile (right) — as before, anchored near bottom */}
      <View style={tw`absolute inset-x-0 bottom-0 px-6 pb-2 pt-2`}>
        <View style={tw`flex-row items-end justify-between`}>
          {/* Left: AI (icon changed to graduation-cap) */}
          <TouchableOpacity
            onPress={() => go(aiRouteName)}
            accessibilityLabel="Learn with AI"
            style={tw`items-center justify-center`}
          >
            <View
              style={tw.style(
                'h-11 w-11 rounded-2xl items-center justify-center',
                isActive(aiRouteName)
                  ? 'bg-indigo-100 dark:bg-indigo-900/40'
                  : 'bg-gray-100 dark:bg-[#172534] border border-gray-200/70 dark:ring-darkCard'
              )}
            >
              <FontAwesome name="graduation-cap" size={ICON_SIZE} color={tw.color('text-default') || '#111'} />
            </View>
            <Text style={tw`mt-1 text-[11px] text-gray-700 dark:text-darkTextPrimary`}>AI</Text>
            {isActive(aiRouteName) && <Dot />}
          </TouchableOpacity>

          {/* Right: Profile (unchanged) */}
          <TouchableOpacity
            onPress={() => go(profileRouteName)}
            accessibilityLabel="My Profile"
            style={tw`items-center justify-center`}
          >
            <View
              style={tw.style(
                'h-11 w-11 rounded-2xl items-center justify-center',
                isActive(profileRouteName)
                  ? 'bg-emerald-100 dark:bg-emerald-900/40'
                  : 'bg-gray-100 dark:bg-[#172534] border border-gray-200/70 dark:ring-darkCard'
              )}
            >
              <FontAwesome name="user" size={ICON_SIZE} color={tw.color('text-default') || '#111'} />
            </View>
            <Text style={tw`mt-1 text-[11px] text-gray-700 dark:text-darkTextPrimary`}>Profile</Text>
            {isActive(profileRouteName) && <Dot />}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default FooterNav;
