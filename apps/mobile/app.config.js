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

  // Android specific config
  android: {
    package: "com.paulmbugua2.mytutorapp",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    versionCode: 1,
  },

  // iOS specific config
  ios: {
    bundleIdentifier: "com.paulmbugua2.mytutorapp",
    supportsTablet: true,
    buildNumber: "1.0.0",
  },

  // Web config
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  // Corrected plugins configuration
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      }
    ],
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          minSdkVersion: 23,
        },
        ios: {
          deploymentTarget: "15.0",
        }
      }
    ],
    // Add other plugins here as needed
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

  // Runtime Versioning
  runtimeVersion: {
    policy: "sdkVersion",
  },

  // Updates configuration
  updates: {
    url: "https://u.expo.dev/015ecf54-6bf2-4727-9283-1525689ccade",
    fallbackToCacheTimeout: 0,
  },

  // Asset bundle patterns
  assetBundlePatterns: [
    "**/*"
  ],
});