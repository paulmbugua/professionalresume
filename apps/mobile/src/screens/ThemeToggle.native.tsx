// apps/mobile/src/screen/ThemeToggle.native.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import tw from '../../tailwind';
import { useThemeMode } from '../theme/ThemeProvider';

export default function ThemeToggle() {
  const { mode, setMode, scheme } = useThemeMode();
  return (
    <View style={tw`flex-row items-center justify-between p-4`}>
      <Text style={tw`text-${scheme === 'dark' ? 'white' : 'lightText'} font-semibold`}>
        Theme: {mode === 'system' ? `System (${scheme})` : mode}
      </Text>
      <View style={tw`flex-row`}>
        {(['system','light','dark'] as const).map(m => (
          <TouchableOpacity
            key={m}
            onPress={() => setMode(m)}
            style={tw`px-3 py-2 mx-1 rounded-lg ${mode===m ? 'bg-primary' : (scheme==='dark' ? 'bg-darkElevated' : 'bg-lightElevated')}`}
          >
            <Text style={tw`text-white`}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
