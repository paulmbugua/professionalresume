// apps/mobile/src/theme/ThemeProvider.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Appearance, ColorSchemeName, ActivityIndicator, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold, 
} from '@expo-google-fonts/poppins';
import {
  Montserrat_400Regular,
  Montserrat_600SemiBold,
  Montserrat_700Bold, 
} from '@expo-google-fonts/montserrat';

import tw from '../../tailwind';
import { useDeviceContext, useAppColorScheme } from 'twrnc';

type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  scheme: Exclude<ColorSchemeName, null>; // 'light' | 'dark'
  toggle: () => void; // flips between light/dark (if system, flips from current system)
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  setMode: () => {},
  scheme: 'light',
  toggle: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // twrnc device context (once, here)
  useDeviceContext(tw);

  // 1) Load fonts globally and register with the exact family names from twrnc.config.js
  const [fontsLoaded] = useFonts({
    Poppins: Poppins_400Regular,          // maps "font-sans" -> Poppins
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
    Montserrat: Montserrat_400Regular,    // maps "font-display" -> Montserrat
    'Montserrat-SemiBold': Montserrat_600SemiBold,
    'Montserrat-Bold': Montserrat_700Bold,
  });

  // Debug: verify tokens + font styles
  useEffect(() => {
    if (fontsLoaded) {
      console.log('tw colors:', tw.color('lightBg'), tw.color('darkBg'));
      console.log('font-sans style:', tw.style('font-sans'));       // expect { fontFamily: 'Poppins' }
      console.log('font-display style:', tw.style('font-display')); // expect { fontFamily: 'Montserrat' }
    }
  }, [fontsLoaded]);

  // 2) Color scheme plumbing
  const [twScheme, , setTwScheme] = useAppColorScheme(tw);
  const [mode, setMode] = useState<ThemeMode>('system');
  const [system, setSystem] = useState<Exclude<ColorSchemeName, null>>(
    (Appearance.getColorScheme() ?? 'light') as 'light' | 'dark'
  );

  // Track OS changes
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystem((colorScheme ?? 'light') as 'light' | 'dark');
    });
    return () => sub.remove();
  }, []);

  // Load saved tri-state once
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('@themeMode');
      if (saved === 'light' || saved === 'dark' || saved === 'system') setMode(saved);
    })();
  }, []);

  // Apply override only when needed
  useEffect(() => {
    const target = mode === 'system' ? system : mode; // 'light' | 'dark'
    if (twScheme !== target) setTwScheme(target);
  }, [mode, system, twScheme, setTwScheme]);

  // Persist tri-state label
  useEffect(() => {
    AsyncStorage.setItem('@themeMode', mode);
  }, [mode]);

  const scheme = mode === 'system' ? (twScheme ?? system) : mode;

  // Toggle helper: flip light/dark (ignores 'system' and picks opposite of current)
  const toggle = useCallback(() => {
    const current = scheme; // 'light' | 'dark'
    setMode(current === 'dark' ? 'light' : 'dark');
  }, [scheme]);

  const value = useMemo(() => ({ mode, setMode, scheme, toggle }), [mode, scheme, toggle]);

  // 3) Gate the tree until fonts are ready (prevents fallback font flashes)
  if (!fontsLoaded) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-lightBg dark:bg-darkBg`}>
        <ActivityIndicator />
      </View>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useThemeMode = () => useContext(ThemeContext);
