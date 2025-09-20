// apps/mobile/src/screens/Navbar.native.tsx
import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { FontAwesome } from '@expo/vector-icons';
import debounce from 'lodash.debounce';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNavbar } from '@mytutorapp/shared/hooks';
import { useShopContext } from '@mytutorapp/shared/context';
import tw from '../../tailwind';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  FindTutor: undefined;
  MyCourses: undefined;
  Resources: undefined;
  RobotTeach: undefined;
  Messages: undefined;
  Settings: undefined;
  BuyTokens: undefined;
  ClassVaultLibrary: undefined;
  // org
  OrgHome: undefined;
  OrgLogin: { next?: string } | undefined;
  OrgProfile: undefined;
};

type NavProp = StackNavigationProp<RootStackParamList>;

type Props = {
  onSearch?: (query: string) => void;
  avatarUrl?: string;
};

const FALLBACK_AVATAR = (name = 'You') =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=223649&color=ffffff`;

// Smooth collapse on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const NavbarNative: FC<Props> = ({ onSearch, avatarUrl }) => {
  const navigation = useNavigation<NavProp>();
  const { token, backendUrl, profile } = (useShopContext() as any) ?? {};

  // --- search state (keeps your useNavbar contract) ---
  const { searchTerm, setSearchTerm } = useNavbar({
    onLogout: () => navigation.navigate('Login'),
    onLogoClick: () => navigation.navigate('Home'),
  });

  // --- mobile sheets toggles (web parity) ---
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const searchRef = useRef<TextInput | null>(null);

  // --- institution mode detection (parity with web sticky flag) ---
  const [isOrg, setIsOrg] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const sticky = await AsyncStorage.getItem('auth:mode');
        setIsOrg(sticky === 'org');
      } catch {}
    })();
  }, []);

  // Close sheets when any nav happens
  useEffect(() => {
    const unsub = (navigation as any).addListener('state', () => {
      setMobileMenuOpen(false);
      setMobileSearchOpen(false);
    });
    return unsub;
  }, [navigation]);

  // Focus input when search opens
  useEffect(() => {
    if (mobileSearchOpen) {
      const t = setTimeout(() => searchRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [mobileSearchOpen]);

  // --- avatar resolve (like web) ---
  const profileAvatarRaw =
    (avatarUrl ||
      profile?.avatar ||
      profile?.photoUrl ||
      profile?.avatar_url ||
      (Array.isArray(profile?.gallery) ? profile.gallery[0] : undefined)) as string | undefined;

  const resolvedAvatar = useMemo(() => {
    if (!profileAvatarRaw || profileAvatarRaw.length === 0) {
      return FALLBACK_AVATAR(profile?.name || 'You');
    }
    if (profileAvatarRaw.startsWith('/') && backendUrl) {
      return `${String(backendUrl).replace(/\/+$/, '')}${profileAvatarRaw}`;
    }
    return profileAvatarRaw;
  }, [profileAvatarRaw, backendUrl, profile?.name]);

  const avatarPress = () => {
    if (isOrg) {
      // org mode: go to org profile or login
      return token
        ? navigation.navigate('OrgProfile')
        : navigation.navigate('OrgLogin', { next: 'OrgProfile' as unknown as string });
    }
    // default: user profile or login
    return token ? navigation.navigate('Home') : navigation.navigate('Login');
  };

  // --- debounced search handler (web parity) ---
  const debounced = useMemo(
    () => debounce((q: string) => onSearch?.(q), 250),
    [onSearch]
  );
  useEffect(() => () => debounced.cancel(), [debounced]);

  const onChangeSearch = (text: string) => {
    setSearchTerm(text);
    debounced(text);
  };

  // --- UI helpers ---
  const toggleMenu = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMobileMenuOpen(v => !v);
  };
  const toggleMobileSearch = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMobileSearchOpen(v => !v);
  };

  const pill = (label: string, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      style={tw`rounded-xl h-9 px-3 items-center justify-center bg-gray-100 dark:bg-[#172534]
                ring-1 ring-gray-200 dark:ring-darkCard mr-2 mb-2`}
    >
      <Text style={tw`text-gray-800 dark:text-darkTextPrimary text-sm`}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={tw`bg-white/90 dark:bg-[#0b121a]/90 border-b border-gray-200 dark:border-darkCard`}>
      {/* Top row */}
      <View style={tw`px-3 py-2 flex-row items-center justify-between`}>
        {/* Left: hamburger + brand */}
        <View style={tw`flex-row items-center`}>
          {/* hamburger */}
          <TouchableOpacity
            onPress={toggleMenu}
            style={tw`md:hidden mr-2 rounded-xl h-10 w-10 items-center justify-center bg-gray-100 dark:bg-[#172534]
                      ring-1 ring-gray-200 dark:ring-darkCard`}
            accessibilityLabel={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <FontAwesome name={mobileMenuOpen ? 'close' : 'bars'} size={18} color={tw.color('text-default') || '#111'} />
          </TouchableOpacity>

          {/* brand */}
          <TouchableOpacity onPress={() => navigation.navigate('Home')} style={tw`flex-row items-center gap-2`}>
            <View style={tw`h-5 w-5 items-center justify-center`}>
              {/* simple brand glyph */}
              <View style={tw`h-5 w-5 rounded-full bg-primary`} />
            </View>
            <Text style={tw`text-base font-extrabold`}>DayBreak</Text>
          </TouchableOpacity>
        </View>

        {/* Right: desktop-ish search (always visible on native), bell, avatar/org */}
        <View style={tw`flex-row items-center`}>
          {/* search trigger (mirrors mobile toggle on web) */}
          <TouchableOpacity
            onPress={toggleMobileSearch}
            style={tw`mr-2 rounded-xl h-10 w-10 items-center justify-center bg-gray-100 dark:bg-[#172534]
                      ring-1 ring-gray-200 dark:ring-darkCard`}
            accessibilityLabel={mobileSearchOpen ? 'Close search' : 'Open search'}
          >
            <FontAwesome name={mobileSearchOpen ? 'close' : 'search'} size={18} color={tw.color('text-default') || '#111'} />
          </TouchableOpacity>

          {/* bell */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Messages')}
            style={tw`mr-2 rounded-xl h-10 w-10 items-center justify-center bg-gray-100 dark:bg-[#172534]
                      ring-1 ring-gray-200 dark:ring-darkCard`}
            accessibilityLabel="Notifications"
          >
            <FontAwesome name="bell" size={18} color={tw.color('text-default') || '#111'} />
          </TouchableOpacity>

          {/* rightmost: org chip or avatar */}
          {isOrg ? (
            <TouchableOpacity
              onPress={() =>
                token
                  ? navigation.navigate('OrgHome')
                  : navigation.navigate('OrgLogin', { next: 'OrgHome' as unknown as string })
              }
              style={tw`rounded-full h-8 px-3 items-center justify-center bg-emerald-600`}
            >
              <Text style={tw`text-white text-xs font-semibold`}>
                {token ? 'Org Profile' : 'Login'}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={avatarPress}
              style={tw`rounded-full overflow-hidden h-10 w-10 items-center justify-center
                        ring-1 ring-gray-200 dark:ring-darkCard`}
              accessibilityLabel={token ? 'Open my profile' : 'Login'}
            >
              <Image
                source={{ uri: resolvedAvatar }}
                resizeMode="cover"
                style={tw`h-10 w-10`}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mobile search reveal (collapsible) */}
      {mobileSearchOpen && (
        <View style={tw`px-3 pb-3`}>
          <View
            style={tw`flex-row items-center rounded-xl px-3 h-11
                      bg-gray-100 dark:bg-[#172534]
                      ring-1 ring-gray-200 dark:ring-darkCard`}
          >
            <FontAwesome name="search" size={16} color={tw.color('text-default') || '#111'} />
            <TextInput
              ref={searchRef}
              placeholder="Search courses, tutors…"
              placeholderTextColor={tw.color('text-muted') || '#94a3b8'}
              value={searchTerm}
              onChangeText={onChangeSearch}
              onSubmitEditing={() => onSearch?.(searchTerm)}
              style={tw`ml-2 flex-1 text-[16px] text-default`}
              returnKeyType="search"
            />
          </View>
        </View>
      )}

      {/* Mobile menu panel (collapsible) */}
      {mobileMenuOpen && (
        <View style={tw`border-t border-gray-200 dark:border-darkCard px-3 py-3`}>
          <View style={tw`flex-row flex-wrap`}>
            {pill('Home', () => navigation.navigate('Home'))}
            {pill('Find Tutors', () => navigation.navigate('FindTutor'))}
            {pill('My Courses', () => navigation.navigate('MyCourses'))}
            {pill('Resources', () => navigation.navigate('Resources'))}
            {pill('Learn with A.I', () => navigation.navigate('RobotTeach'))}
            {/* “For Institutions” CTA */}
            {pill('For Institutions', () =>
              isOrg && token
                ? navigation.navigate('OrgHome')
                : navigation.navigate('OrgLogin', { next: 'OrgHome' as unknown as string })
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

export default NavbarNative;
