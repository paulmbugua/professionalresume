import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useThemePref } from '../theme/ThemeContext';
import tw from '../../tailwind';

const ThemeToggle: React.FC = () => {
  const { pref, resolvedScheme, toggle, resetSystem, setPref } = useThemePref();
  const isDark = resolvedScheme === 'dark';

  return (
    <View style={tw`flex-row items-center gap-2`}>
      {/* Light/Dark pill */}
      <Pressable
        onPress={toggle}
        accessibilityRole="switch"
        accessibilityState={{ checked: isDark }}
        style={tw`${isDark ? 'bg-[#3d99f5]' : 'bg-[#e7edf4] dark:bg-[#172534]'} relative h-[31px] w-[64px] rounded-full p-0.5`}
      >
        <View
          style={[
            tw`h-full w-[29px] rounded-full bg-white`,
            { transform: [{ translateX: isDark ? 33 : 0 }] },
          ]}
        />
      </Pressable>

      {/* Label reflects current effective scheme */}
      <Text style={tw`text-sm text-[#49739c] dark:text-white/70 w-[56px]`}>
        {isDark ? 'Dark' : 'Light'}
      </Text>

      {/* System button */}
      <Pressable
        onPress={resetSystem}
        disabled={pref === 'system'}
        style={tw`${pref === 'system' ? 'opacity-60' : ''} h-8 px-3 rounded-lg items-center justify-center bg-[#e7edf4] dark:bg-[#172534]`}
      >
        <Text style={tw`text-sm font-semibold`}>System</Text>
      </Pressable>

      {/* Optional quick labels to jump explicitly */}
      {/* Uncomment if you want explicit taps instead of toggle
      <Pressable onPress={() => setPref('light')} style={tw`ml-2 h-8 px-3 rounded-lg items-center justify-center bg-[#e7edf4] dark:bg-[#172534]`}>
        <Text style={tw`text-sm`}>Light</Text>
      </Pressable>
      <Pressable onPress={() => setPref('dark')} style={tw`ml-2 h-8 px-3 rounded-lg items-center justify-center bg-[#e7edf4] dark:bg-[#172534]`}>
        <Text style={tw`text-sm`}>Dark</Text>
      </Pressable>
      */}
    </View>
  );
};

export default ThemeToggle;
