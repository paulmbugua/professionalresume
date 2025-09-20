// apps/mobile/src/screens/ThemeToggle.native.tsx
import React from "react";
import { Pressable, Text, View } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons"; // or `react-native-vector-icons/FontAwesome5`
import { useTheme } from "@mytutorapp/shared/hooks";

const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Pressable
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="
        flex-row items-center gap-2
        px-3 py-2 rounded-lg
        border border-slate-300 dark:border-white/15
        bg-white dark:bg-[#0f1821]
        "
      android_ripple={{ color: "rgba(99,102,241,0.15)", borderless: false }}
    >
      <View className="
        h-6 w-6 rounded-md items-center justify-center
        bg-slate-100 dark:bg-white/10
      ">
        <FontAwesome5
          name={isDark ? "sun" : "moon"}
          size={14}
          color={isDark ? "#facc15" : "#0f172a"}
        />
      </View>

      {!compact && (
        <Text className="text-slate-800 dark:text-white text-sm font-medium">
          {isDark ? "Light Mode" : "Dark Mode"}
        </Text>
      )}
    </Pressable>
  );
};

export default ThemeToggle;
