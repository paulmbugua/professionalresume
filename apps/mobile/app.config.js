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

  // Android Configuration
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
      "android.permission.RECORD_AUDIO"
    ],
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
      }
    }
  },

  // iOS Configuration
  ios: {
    bundleIdentifier: "com.paulmbugua2.mytutorapp",
    supportsTablet: true,
    buildNumber: "1.0.0",
    infoPlist: {
      NSPhotoLibraryUsageDescription: "Allow $(PRODUCT_NAME) to access your photos",
      NSCameraUsageDescription: "Allow $(PRODUCT_NAME) to use the camera",
      NSMicrophoneUsageDescription: "Allow $(PRODUCT_NAME) to use your microphone",
      UIBackgroundModes: ["audio"],
      UIUserInterfaceStyle: "Automatic"
    },
    config: {
      usesNonExemptEncryption: false,
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || ""
    }
  },

  // Web Configuration
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },

  // Plugins Configuration
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
          kotlinVersion: "1.8.0",
        },
        ios: {
          deploymentTarget: "15.1",  // Updated to meet minimum requirements
          useFrameworks: "static"
        }
      }
    ],
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Allow $(PRODUCT_NAME) to use your location."
      }
    ]
  ],

  // Experiments
  experiments: {
    typedRoutes: true,
    tsconfigPaths: true
  },

  // Environment Variables
  extra: {
    ...config.extra,
    backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL || "https://localhost:4000",
        eas: {
      projectId: "015ecf54-6bf2-4727-9283-1525689ccade",
    },
  },

  // Updates Configuration
  updates: {
    url: "https://u.expo.dev/015ecf54-6bf2-4727-9283-1525689ccade",
    fallbackToCacheTimeout: 0,
    checkAutomatically: "ON_LOAD"
  },

  // Asset Bundle Patterns
  assetBundlePatterns: [
    "**/*"
  ],

  // Runtime Version
  runtimeVersion: {
    policy: "sdkVersion"
  },

  // New Architecture
  newArchitecture: {
    enabled: true
  }
});