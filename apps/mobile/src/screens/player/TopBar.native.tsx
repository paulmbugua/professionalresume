import React from 'react';
import { View, Text, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '../../../tailwind';
import VoiceSelectNative from './VoiceSelect.native';

type Props = {
  voiceName: string;
  title: string;

  useJoined: boolean;
  hasLessons: boolean;
  displayIdx: number;
  totalLessonsForUi: number;
  isBuildingNext: boolean;

  isPlaying: boolean;
  loading: boolean;

  showTranscript: boolean;
  showNotes: boolean;
  isMax: boolean;

  onMeasuredHeight: (h: number) => void;

  onPlay: () => void;
  onPrev: () => void;
  onNext: () => void;

  onToggleTranscript: () => void;
  onToggleNotes: () => void;
  onToggleMax: () => void;
  onToggleThemePanel?: () => void;

  // NEW: voice selection wiring
  voiceOptions?: string[];
  voiceLoading?: boolean;
  voiceError?: string | null;
  onChangeVoice?: (v: string) => void;
};

const chipBase = tw`h-9 w-9 items-center justify-center rounded-xl`;
const chipInactive = tw`bg-white/10`;
const chipActive = tw`bg-white`;

export default function TopBar({
  voiceName,
  title,
  useJoined,
  hasLessons,
  displayIdx,
  totalLessonsForUi,
  isBuildingNext,
  isPlaying,
  loading,
  showTranscript,
  showNotes,
  isMax,
  onMeasuredHeight,
  onPlay,
  onPrev,
  onNext,
  onToggleTranscript,
  onToggleNotes,
  onToggleMax,
  onToggleThemePanel,
  voiceOptions,
  voiceLoading,
  voiceError,
  onChangeVoice,
}: Props) {
  const handleLayout = (e: LayoutChangeEvent) => {
    onMeasuredHeight(e.nativeEvent.layout.height);
  };

  return (
    <View collapsable={false}>
      <SafeAreaView edges={['top']} style={tw`bg-black/35`}>
        <View
          onLayout={handleLayout}
          style={[
            tw`px-3 py-1.5`,
            { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
          ]}
        >
          {/* LEFT: title + voice selector */}
          <View style={{ flexShrink: 1 }}>
            <Text
              style={tw`text-white/85 text-xs`}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {title}
            </Text>

            <View style={tw`mt-1`}>
              {onChangeVoice && voiceOptions && voiceOptions.length > 0 ? (
                <VoiceSelectNative
                  value={voiceName}
                  onChange={onChangeVoice}
                  options={voiceOptions}
                  loading={voiceLoading}
                  error={voiceError}
                />
              ) : (
                <Text
                  style={tw`text-white/60 text-[11px]`}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {voiceName}
                </Text>
              )}
            </View>
          </View>

          {/* RIGHT: controls */}
          <View
            style={[
              { marginLeft: 'auto' },
              tw`flex-row gap-2`,
              { flexWrap: 'wrap', alignItems: 'center' },
            ]}
          >
            {!useJoined && hasLessons && (
              <View
                style={[
                  tw`flex-row gap-2`,
                  { flexWrap: 'wrap', alignItems: 'center' },
                ]}
              >
                <TouchableOpacity
                  onPress={onPrev}
                  disabled={displayIdx <= 0}
                  style={tw`px-2 py-1.5 rounded bg-white/10`}
                >
                  <Text style={tw`text-white text-xs`}>Prev</Text>
                </TouchableOpacity>

                <Text style={tw`text-white/80 text-xs`}>
                  {displayIdx + 1}/{totalLessonsForUi}
                </Text>

                <TouchableOpacity
                  onPress={onNext}
                  disabled={
                    !!isBuildingNext || displayIdx >= totalLessonsForUi - 1
                  }
                  style={tw`px-2 py-1.5 rounded bg-white/10`}
                >
                  <Text style={tw`text-white text-xs`}>
                    {isBuildingNext ? 'Preparing next…' : 'Next'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Play button (primary) */}
            <TouchableOpacity
              onPress={onPlay}
              disabled={loading}
              style={tw`px-3 py-1.5 rounded-2xl bg-white`}
            >
              <Text style={tw`text-black text-xs font-semibold`}>
                {isPlaying ? 'Pause' : 'Play'}
              </Text>
            </TouchableOpacity>

            {/* Transcript icon */}
            <TouchableOpacity
              onPress={onToggleTranscript}
              style={[
                chipBase,
                showTranscript ? chipActive : chipInactive,
              ]}
              accessibilityLabel={
                showTranscript ? 'Hide transcript' : 'Show transcript'
              }
            >
              <Text
                style={
                  showTranscript
                    ? tw`text-black text-lg`
                    : tw`text-white text-lg`
                }
              >
                ≣
              </Text>
            </TouchableOpacity>

            {/* Theme icon */}
            {onToggleThemePanel && (
              <TouchableOpacity
                onPress={onToggleThemePanel}
                style={[chipBase, chipInactive]}
                accessibilityLabel="Backdrop theme"
              >
                <Text style={tw`text-white text-lg`}>🎨</Text>
              </TouchableOpacity>
            )}

            {/* Maximize / Minimize icon */}
          
            <TouchableOpacity
            onPress={onToggleMax}
            style={[chipBase, chipInactive]}
            accessibilityLabel={isMax ? 'Exit full view' : 'Maximize'}
            >
            <Text style={tw`text-white text-lg`}>
                ⛶
            </Text>
            </TouchableOpacity>


            {/* Notes icon */}
            <TouchableOpacity
              onPress={onToggleNotes}
              style={[
                chipBase,
                showNotes ? chipActive : chipInactive,
              ]}
              accessibilityLabel={showNotes ? 'Hide notes' : 'Show notes'}
            >
              <Text
                style={
                  showNotes
                    ? tw`text-black text-lg`
                    : tw`text-white text-lg`
                }
              >
                📝
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
