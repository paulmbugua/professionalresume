// apps/mobile/src/screens/ThemeToggle.native.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import tw from "../../tailwind";
import { useTheme } from "@mytutorapp/shared/hooks";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <View style={tw`flex-row items-center justify-between p-4`}>
      <Text style={tw`text-${theme === "dark" ? "white" : "black"} font-semibold`}>
        Theme: {theme}
      </Text>
      <View style={tw`flex-row`}>
        {(["light", "dark"] as const).map((m) => (
          <TouchableOpacity
            key={m}
            onPress={() => setTheme(m)}
            style={tw`px-3 py-2 mx-1 rounded-lg ${
              theme === m
                ? "bg-primary"
                : m === "dark"
                ? "bg-gray-700"
                : "bg-gray-300"
            }`}
          >
            <Text style={tw`text-white`}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
