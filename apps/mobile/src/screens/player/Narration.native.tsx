/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import type { TextStyle } from 'react-native';
import tw from '../../../tailwind';
import { useThemeTokens } from './ThemeContext.native';
import type { HighlightTemplate } from './ThemeContext.native';

type WordTiming = { text: string; start: number; end: number };
type Line = { text: string; start: number; end: number; indices: number[] };

type Props = {
  chromeTop: number;      // still passed, but not used for layout
  chromeBottom: number;   // still passed, but not used for layout
  words: WordTiming[];
  lines: Line[];
  activeLine: number;
  currentIndex: number;
  isMax: boolean;
};

const Narration: React.FC<Props> = ({
  chromeTop: _chromeTop,
  chromeBottom: _chromeBottom,
  words,
  lines,
  activeLine,
  currentIndex,
  isMax,
}) => {
  const {
    hlHex,
    genHex,
    activeTextOnHl,
    templateId,
  } = useThemeTokens();

  const [fontScale, setFontScale] = useState(1);

  if (!lines.length) return null;

  const MAX_LINES = isMax ? 5 : 3;
  const contextLines = lines.slice(0, MAX_LINES);

  const baseFontSize = isMax ? 18 : 15;
  const effectiveFontSize = baseFontSize * fontScale;
  const lineHeight = effectiveFontSize * 1.35;

  const cycleFontScale = () => {
    setFontScale((prev) => {
      if (prev < 1.15) return 1.2;
      if (prev < 1.35) return 1.4;
      return 1; // back to default
    });
  };

  // rough bubble height for vertical centering
  const bubbleHeight = contextLines.length * lineHeight + 24;
  const halfBubble = bubbleHeight / 2;

  return (
    <View
      pointerEvents="box-none"
      style={[
        tw`absolute left-0 right-0 px-4`,
        {
          top: '50%',
          alignItems: 'center',
          // shift upwards by half the bubble height so it's visually centered
          transform: [{ translateY: -halfBubble }],
        },
      ]}
    >
      <Pressable
        onPress={cycleFontScale}
        style={tw`bg-black/45 rounded-2xl px-4 py-3 max-w-[95%]`}
        android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: false }}
      >
        {contextLines.map((line, lineIdx) => (
          <Text
            key={`${line.start}-${line.end}-${lineIdx}`}
            style={[
              tw`text-white flex-row flex-wrap`,
              lineIdx > 0 && tw`mt-1`,
              {
                fontSize: effectiveFontSize,
                lineHeight,
              },
            ]}
          >
            {line.indices.map((wi, j) => {
              const w = words[wi];
              if (!w) return null;

              const isActiveWord = wi === currentIndex;

              const isPunct = /^[,.;:!?]+$/.test(w.text.trim());
              const prefix = j === 0 ? '' : (isPunct ? '' : ' ');
              const displayText = prefix + w.text;

              const baseWordStyle: TextStyle = {
                color: genHex,
                opacity: 0.95,
              };

              let activeStyle: TextStyle = {};
              if (isActiveWord) {
                switch (templateId as HighlightTemplate) {
                  case 'boxed-pill':
                    activeStyle = {
                      backgroundColor: hlHex,
                      color: activeTextOnHl,
                      borderRadius: 4,
                    };
                    break;
                  case 'underline-glow':
                    activeStyle = {
                      color: activeTextOnHl,
                      textDecorationLine: 'underline',
                      textDecorationColor: hlHex,
                      textDecorationStyle: 'solid',
                    };
                    break;
                  case 'karaoke-glow':
                    activeStyle = {
                      color: activeTextOnHl,
                      textShadowColor: hlHex,
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 6,
                    };
                    break;
                  case 'ribbon':
                    activeStyle = {
                      backgroundColor: hlHex,
                      color: activeTextOnHl,
                      borderRadius: 999,
                    };
                    break;
                  case 'clean-stripe':
                  default:
                    activeStyle = {
                      backgroundColor: hlHex + '33',
                      color: activeTextOnHl,
                      borderRadius: 2,
                    };
                    break;
                }
              }

              return (
                <Text
                  key={wi}
                  style={[baseWordStyle, isActiveWord && activeStyle]}
                >
                  {displayText}
                </Text>
              );
            })}
          </Text>
        ))}
      </Pressable>
    </View>
  );
};

export default Narration;
