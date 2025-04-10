/* eslint-env node */
/* global process */

import dotenv from 'dotenv';
dotenv.config();

export default ({ config }) => ({
  ...config,
  name: "FunzaSasa",
  slug: "funzasasa",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "myapp",
  userInterfaceStyle: "automatic",
  entryPoint: "./src/index.tsx",

  icon: "./assets/images/icon.png",

  platforms: ["ios", "android"],

  android: {
    package: "com.paulmbugua2.mytutorapp",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
  },

  ios: {
    bundleIdentifier: "com.paulmbugua2.mytutorapp",
    supportsTablet: true,
  },

  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],
  ],

  experiments: {
    typedRoutes: true,
  },

  extra: {
    ...config.extra,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || "https://localhost:4000",
    eas: {
      projectId: "015ecf54-6bf2-4727-9283-1525689ccade",
    },
  },

  newArchitecture: {
    enabled: true,
  },
});
