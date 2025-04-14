/* eslint-env node */
/* global process */
import dotenv from 'dotenv';
dotenv.config();

export default ({ config }) => ({
  ...config,

  // ==================== Basic App Configuration ====================
  name: "FunzaSasa",
  slug: "funzasasa",
  version: "1.0.0",
  orientation: "portrait",
  scheme: "myapp",
  entryPoint: "./src/index.tsx",
  runtimeVersion: {
    policy: "sdkVersion",
  },
  assetBundlePatterns: ["**/*"],

  // ==================== UI/Design Configuration ====================
  userInterfaceStyle: "automatic",
  icon: "./assets/images/icon.png",
  platforms: ["ios", "android"],

  // ==================== Android ====================
  android: {
    package: "com.paulmbugua2.mytutorapp",
    adaptiveIcon: {
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    versionCode: 1,
    permissions: [
      "android.permission.INTERNET",
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
    ],
    googleServicesFile: "../android/app/google-services.json",

  },

  // ==================== iOS ====================
  ios: {
    bundleIdentifier: "com.paulmbugua2.mytutorapp",
    supportsTablet: true,
    buildNumber: "1.0.0",
    infoPlist: {
      NSPhotoLibraryUsageDescription: "Allow $(PRODUCT_NAME) to access your photos",
      NSCameraUsageDescription: "Allow $(PRODUCT_NAME) to use the camera",
      NSMicrophoneUsageDescription: "Allow $(PRODUCT_NAME) to use your microphone",
      UIBackgroundModes: ["audio"],
      UIUserInterfaceStyle: "Automatic",
    },
    config: {
      usesNonExemptEncryption: false,
    },
  },

  // ==================== Web ====================
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  // ==================== Plugins ====================
  plugins: [
    // Routing
    "expo-router",

    // UI/Appearance
    "expo-system-ui",

    // Splash
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      },
    ],

    // 👇👇 This is necessary for Kotlin version and SDK level on EAS Build!
    [
      "expo-build-properties",
      {
        android: {
          compileSdkVersion: 35,
          targetSdkVersion: 35,
          minSdkVersion: 23,
          kotlinVersion: "1.7.20",
        },
        ios: {
          deploymentTarget: "15.1",
          useFrameworks: "static",
        },
      },
    ],

    // Permissions
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "Allow $(PRODUCT_NAME) to use your location.",
      },
    ],

    // Google Sign-In Plugin (optional but helpful)
    [
      "@react-native-google-signin/google-signin",
      {
        scopes: ["email", "profile", "openid"],
        webClientId: "557799973381-ksp83t2vo6fdqufhm0iie06lnb4e8j8v.apps.googleusercontent.com",
        iosUrlScheme: "com.googleusercontent.apps.557799973381-ksp83t2vo6fdqufhm0iie06lnb4e8j8v",
        offlineAccess: true
      },
    ],
    
  ],

  // ==================== Experiments ====================
  experiments: {
    typedRoutes: true,
    tsconfigPaths: true,
  },

  // ==================== Env + EAS Config ====================
  extra: {
    ...config.extra,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || "https://localhost:4000",
    eas: {
      projectId: "015ecf54-6bf2-4727-9283-1525689ccade",
    },
  },

  // ==================== Updates ====================
  updates: {
    url: "https://u.expo.dev/015ecf54-6bf2-4727-9283-1525689ccade",
    fallbackToCacheTimeout: 0,
    checkAutomatically: "ON_LOAD",
  },

  // ==================== New Architecture ====================
  newArchitecture: {
    enabled: true,
  },
});
