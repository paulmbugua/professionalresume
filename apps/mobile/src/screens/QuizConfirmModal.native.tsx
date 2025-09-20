// apps/mobile/src/screens/QuizConfirmModal.native.tsx
import React, { useEffect, useMemo, useRef } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  BackHandler,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
} from "react-native";
import { useColorScheme } from "react-native";

type QuizConfirmModalProps = {
  open: boolean;
  lessons: number;
  questions: number;
  timeLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

const QuizConfirmModal: React.FC<QuizConfirmModalProps> = ({
  open,
  lessons,
  questions,
  timeLabel,
  onCancel,
  onConfirm,
}) => {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  // Animations
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start(() => {
        AccessibilityInfo.setAccessibilityFocus?.(titleRef.current as any);
      });
    } else {
      fade.setValue(0);
      scale.setValue(0.96);
    }
  }, [open]);

  // Android hardware back
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [open, onCancel]);

  const titleRef = useRef<View | null>(null);

  // Palette hooks (only for places Tailwind can’t express: backdrop rgba + tiny triangle)
  const colors = useMemo(
    () => ({
      backdrop: "rgba(0,0,0,0.45)",
      ring: isDark ? "rgba(255,255,255,0.10)" : "rgba(17,24,39,0.12)",
      divider: isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)",
      primary: "#4f46e5",
      primaryAlt: "#6366f1",
    }),
    [isDark]
  );

  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      accessibilityViewIsModal
    >
      {/* Backdrop */}
      <Animated.View
        style={{ opacity: fade, backgroundColor: colors.backdrop }}
        className="absolute inset-0"
      />
      <Pressable className="absolute inset-0" onPress={onCancel} accessibilityRole="button" accessibilityLabel="Close dialog" />

      {/* Centered Card */}
      <View className="flex-1 items-center justify-center p-4" pointerEvents="box-none">
        <Animated.View
          style={{ opacity: fade, transform: [{ scale }] }}
          className={`
            w-full max-w-[560px] overflow-hidden rounded-2xl
            bg-white dark:bg-[#0f1821]
            shadow-2xl
            border border-transparent
          `}
        >
          {/* (Hairline) ring we can’t fully do with Tailwind on RN: */}
          <View style={{ position: "absolute", inset: 0, borderRadius: 16, borderWidth: 1, borderColor: colors.ring }} pointerEvents="none" />

          {/* Header */}
          <View className="px-5 pt-5">
            <View
              ref={titleRef}
              collapsable={false}
              accessible
              accessibilityRole="header"
              accessibilityLabel="Ready to start your quiz?"
              className="h-11 w-11 items-center justify-center rounded-xl shadow-md"
              style={{ backgroundColor: colors.primary }}
            >
              {/* Play triangle via borders */}
              <View
                style={{
                  width: 0,
                  height: 0,
                  borderTopWidth: 8,
                  borderBottomWidth: 8,
                  borderLeftWidth: 12,
                  borderTopColor: "transparent",
                  borderBottomColor: "transparent",
                  borderLeftColor: "#fff",
                }}
              />
            </View>

            <Text className="mt-3 text-xl font-extrabold text-slate-900 dark:text-white">
              Ready to start your quiz?
            </Text>
            <Text className="mt-1 text-sm text-slate-600 dark:text-white/70">
              Make sure you’ve reviewed the lesson. The timer (if any) starts immediately.
            </Text>
          </View>

          {/* Summary */}
          <View className="px-5 mt-4">
            <View className="flex-row gap-2">
              <InfoCard label="Lessons" value={String(lessons)} />
              <InfoCard label="Questions" value={String(questions)} />
              <InfoCard label="Time" value={timeLabel} />
            </View>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.divider }} className="mt-5" />

          {/* Actions */}
          <View className="px-5 py-3 flex-row justify-end gap-2">
            <Pressable
              onPress={onCancel}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-white/15"
              android_ripple={{ color: isDark ? "rgba(255,255,255,0.08)" : "#eef2ff", borderless: false }}
              accessibilityRole="button"
              accessibilityLabel="Not now"
              testID="quiz-confirm-cancel"
            >
              <Text className="text-sm font-medium text-slate-700 dark:text-white/90">Not now</Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              className="px-4 py-2 rounded-xl bg-indigo-600"
              style={({ pressed }) => ({ backgroundColor: pressed ? colors.primaryAlt : colors.primary })}
              accessibilityRole="button"
              accessibilityLabel="Start quiz"
              testID="quiz-confirm-start"
            >
              <Text className="text-sm font-semibold text-white">Start quiz</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const InfoCard = ({ label, value }: { label: string; value: string }) => (
  <View
    className="
      flex-1 items-center rounded-xl
      bg-white dark:bg-white/5
      border border-slate-200 dark:border-white/10
      px-2.5 py-3
    "
    accessible
    accessibilityLabel={`${label}: ${value}`}
  >
    <Text className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-white/60">
      {label}
    </Text>
    <Text className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">
      {value}
    </Text>
  </View>
);

export default QuizConfirmModal;
