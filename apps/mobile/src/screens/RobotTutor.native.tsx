// apps/mobile/src/pages/RobotTutor.native.tsx
import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import tw from '../../tailwind';
// Use the native implementation of your tutor component
import RobotTeacher from '../screens/RobotTeacher.native';

const DEFAULT_SSML = `<speak>
  <p>Hello! I am your robot tutor.</p>
  <p>Today we will learn fractions. <break time="400ms"/></p>
  <p>Repeat after me: one half. one third. one quarter.</p>
</speak>`;

const RobotTutorScreen: React.FC = () => {
  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
      <ScrollView
        contentContainerStyle={tw`py-6`}
        keyboardShouldPersistTaps="handled"
      >
        {/* Theme-aware wrapper; spacing keeps clear of header/footer */}
        <View style={tw`mx-auto w-full max-w-[1120px] px-3`}>
          <RobotTeacher initialSsml={DEFAULT_SSML} voiceName="en-US-JennyNeural" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RobotTutorScreen;
