// apps/mobile/src/pages/RobotTutor.native.tsx
import React from 'react';
import { SafeAreaView, View } from 'react-native';
import tw from '../../tailwind';
import RobotTeacher from '../screens/RobotTeacher.native';

// Shared refresh container
import { RefreshableScrollView } from '../refresh/Refreshable';

// ⬇️ Local type escape so we can use the extra `screenId` prop
const RefreshableAny: any = RefreshableScrollView;

const DEFAULT_SSML = `<speak>
  <p>Hello! I am your robot tutor.</p>
  <p>Today we will learn fractions. <break time="400ms"/></p>
  <p>Repeat after me: one half. one third. one quarter.</p>
</speak>`;

const RobotTutorScreen: React.FC = () => {
  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50 dark:bg-[#0b1016]`}>
      <RefreshableAny
        screenId="robot-tutor"           // stable id for this page
        contentContainerStyle={tw`py-6`}
        keyboardShouldPersistTaps="handled"
      >
        <View style={tw`mx-auto w-full max-w-[1120px] px-3`}>
          <RobotTeacher initialSsml={DEFAULT_SSML} voiceName="en-US-JennyNeural" />
        </View>
      </RefreshableAny>
    </SafeAreaView>
  );
};

export default RobotTutorScreen;
