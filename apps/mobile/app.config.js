// apps/mobile/app.config.js

import 'dotenv/config';

export default ({ config }) => {
  const isRouterEnabled = true; // set to false if you ever remove expo-router

  return {
    ...config,
    name: "FunzaSasa",
    slug: "funzasasa",
    version: "1.0.0",
    scheme: "funzasasa",
    runtimeVersion: { policy: "sdkVersion" },
    
    android: {
      ...config.android,
      package: "com.paulmbugua2.mytutorapp",
      versionCode: 1,
      permissions: ["INTERNET", "CAMERA", "RECORD_AUDIO"],
      // Must match the exact filename on disk:
      googleServicesFile: "./google-services.json",
    },

    ios: {
      ...config.ios,
      bundleIdentifier: "com.paulmbugua2.mytutorapp",
      buildNumber: "1.0.0",
    },

    web: {
      ...config.web,
      bundler: "metro",
      output: "static",
    },

    plugins: [
      
      isRouterEnabled && "expo-router",

      // 3) Other plugins
      "expo-system-ui",
      ["expo-splash-screen", {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
      }],
      ["expo-location", {
        locationAlwaysAndWhenInUsePermission:
          "Allow $(PRODUCT_NAME) to use your location.",
      }],
      ["@react-native-google-signin/google-signin", {
        scopes: ["email", "profile", "openid"],
        webClientId: "557799973381-…",
        iosUrlScheme: "com.googleusercontent.apps.557799973381-…",
        offlineAccess: true,
      }],
    ].filter(Boolean),

    extra: {
      ...config.extra,
      backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL ?? "https://localhost:4000",
      eas: {
        projectId: "015ecf54-6bf2-4727-9283-1525689ccade",
      },
    },

    updates: {
      url: "https://u.expo.dev/015ecf54-6bf2-4727-9283-1525689ccade",
      fallbackToCacheTimeout: 0,
      checkAutomatically: "ON_LOAD",
    },

    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
    },

    newArchitecture: {
      enabled: true,
    },
  };
};
