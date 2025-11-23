import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '../../../tailwind';

type Props = {
  currentSec: number;
  durationSec: number;
  progress: number;

  onBack5: () => void;
  onFwd5: () => void;
  onPlay: () => void;
  playing: boolean;
  loading: boolean;

  useJoined: boolean;
  hasLessons: boolean;
  displayIdx: number;
  totalLessonsForUi: number;
  isBuildingNext: boolean;

  showTranscript: boolean;
  showNotes: boolean;
  isMax: boolean;

  onMeasuredHeight: (h: number) => void;

  onPrev: () => void;
  onNext: () => void;

  onToggleTranscript: () => void;
  onToggleThemePanel?: () => void;
  onToggleMax: () => void;
  onToggleNotes: () => void;

  onSeek: (sec: number) => void;
};

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const chipBase = tw`h-9 w-9 items-center justify-center rounded-xl`;
const chipInactive = tw`bg-white/10`;
const chipActive = tw`bg-white`;

export default function BottomBar({
  currentSec,
  durationSec,
  progress,
  onBack5,
  onFwd5,
  onPlay,
  playing,
  loading,
  useJoined,
  hasLessons,
  displayIdx,
  totalLessonsForUi,
  isBuildingNext,
  showTranscript,
  showNotes,
  isMax,
  onMeasuredHeight,
  onPrev,
  onNext,
  onToggleTranscript,
  onToggleThemePanel,
  onToggleMax,
  onToggleNotes,
  onSeek,
}: Props) {
  const [barWidth, setBarWidth] = useState(0);

  const handleLayout = (e: LayoutChangeEvent) => {
    onMeasuredHeight(e.nativeEvent.layout.height);
  };

  const handleScrubPress = (x: number) => {
    if (!durationSec || barWidth <= 0) return;
    const ratio = Math.min(1, Math.max(0, x / barWidth));
    onSeek(ratio * durationSec);
  };

  return (
    <View collapsable={false}>
      <SafeAreaView
        edges={['bottom']}
        onLayout={handleLayout}
        style={tw`bg-black/45`}
      >
        <View style={tw`px-3 py-2`}>
          {/* Row 1 */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {/* Transport */}
            <View
              style={[
                tw`flex-row gap-2`,
                { alignItems: 'center' },
              ]}
            >
              <TouchableOpacity
                onPress={onBack5}
                style={tw`h-10 w-10 items-center justify-center rounded-xl bg-white/10`}
              >
                <Text style={tw`text-white text-lg`}>{'⏪'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onPlay}
                disabled={loading}
                style={tw`h-10 px-4 items-center justify-center rounded-2xl bg-white`}
              >
                <Text style={tw`text-black font-semibold text-xs`}>
                  {playing ? 'Pause' : 'Play'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onFwd5}
                style={tw`h-10 w-10 items-center justify-center rounded-xl bg-white/10`}
              >
                <Text style={tw`text-white text-lg`}>{'⏩'}</Text>
              </TouchableOpacity>
            </View>

            {/* Prev / Counter / Next */}
            {!useJoined && hasLessons && (
              <View
                style={[
                  tw`ml-2 flex-row gap-2`,
                  { alignItems: 'center', flexWrap: 'wrap' },
                ]}
              >
                <TouchableOpacity
                  onPress={onPrev}
                  disabled={displayIdx <= 0}
                  style={tw`h-10 px-3 rounded-xl bg-white/10`}
                >
                  <Text style={tw`text-white text-xs`}>Prev</Text>
                </TouchableOpacity>
                <Text style={tw`text-white/85 text-xs`}>
                  {displayIdx + 1}/{totalLessonsForUi}
                </Text>
                <TouchableOpacity
                  onPress={onNext}
                  disabled={
                    !!isBuildingNext || displayIdx >= totalLessonsForUi - 1
                  }
                  style={tw`h-10 px-3 rounded-xl bg-white/10`}
                >
                  <Text style={tw`text-white text-xs`}>
                    {isBuildingNext ? 'Preparing next…' : 'Next'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Times */}
            <View
              style={[
                tw`ml-2 flex-row gap-2`,
                { alignItems: 'center' },
              ]}
            >
              <Text style={tw`text-white/85 text-xs`}>
                {formatTime(currentSec)}
              </Text>
              <Text style={tw`text-white/60 text-xs`}>/</Text>
              <Text style={tw`text-white/85 text-xs`}>
                {durationSec ? formatTime(durationSec) : '0:00'}
              </Text>
            </View>

            {/* Utilities (icon chips) */}
            <View
              style={[
                { marginLeft: 'auto' },
                tw`flex-row gap-2`,
                { flexWrap: 'wrap', alignItems: 'center' },
              ]}
            >
              {/* Transcript */}
              <TouchableOpacity
                onPress={onToggleTranscript}
                style={[
                  chipBase,
                  showTranscript ? chipActive : chipInactive,
                ]}
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

              {/* Theme */}
              {onToggleThemePanel && (
                <TouchableOpacity
                  onPress={onToggleThemePanel}
                  style={[chipBase, chipInactive]}
                >
                  <Text style={tw`text-white text-lg`}>🎨</Text>
                </TouchableOpacity>
              )}

              {/* Maximize / Minimize */}
           
                <TouchableOpacity
                onPress={onToggleMax}
                style={[chipBase, chipInactive]}
                accessibilityLabel={isMax ? 'Exit full view' : 'Maximize'}
                >
                <Text style={tw`text-white text-lg`}>
                    ⛶
                </Text>
                </TouchableOpacity>


              {/* Notes */}
              <TouchableOpacity
                onPress={onToggleNotes}
                style={[
                  chipBase,
                  showNotes ? chipActive : chipInactive,
                ]}
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

          {/* Row 2: scrubber */}
          <View style={tw`mt-2 flex-row items-center gap-2`}>
            <Text
              style={tw`text-white/70 text-[11px] w-12 text-right`}
            >
              {formatTime(currentSec)}
            </Text>
            <View
              style={tw`flex-1 h-3 rounded-full bg-white/15 overflow-hidden`}
              onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
            >
              <Pressable
                style={tw`absolute inset-0`}
                onPress={(e) => handleScrubPress(e.nativeEvent.locationX)}
              >
                <View
                  style={[
                    tw`h-full bg-white/85`,
                    { width: `${Math.round((progress || 0) * 100)}%` },
                  ]}
                />
              </Pressable>
            </View>
            <Text
              style={tw`text-white/70 text-[11px] w-12`}
            >
              {durationSec ? formatTime(durationSec) : '0:00'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
