// apps/mobile/app.config.js
import 'dotenv/config';

export default function expoConfig({ config }) {
  const isEAS = process.env.EAS_BUILD === 'true';

  return {
    ...config,
    name: 'DayBreak',
    slug: 'funzasasa',
    version: '1.0.0',
    scheme: 'daybreak',                     // ← single canonical scheme
    runtimeVersion: { policy: 'sdkVersion' },
    userInterfaceStyle: 'automatic',

    // ---- Universal app icon for legacy paths (Expo generates densities) ----
    icon: './assets/icon.png',              // 1024×1024

    android: {
      ...config.android,
      package: 'com.paulmbugua2.mytutorapp',
      versionCode: 1,
      permissions: ['INTERNET', 'CAMERA', 'RECORD_AUDIO'],
      googleServicesFile: './google-services.json',
      usesCleartextTraffic: true,

      // ---- Adaptive icon (Android 8+) ----
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon-foreground.png',   // 432×432
        monochromeImage: './assets/adaptive-icon-monochrome.png',   // 432×432 (Android 13+)
         backgroundColor: '#FFFFFF',                                // solid bg (fast, crisp)
        // backgroundImage: './assets/adaptive-icon-background.png',  // (optional) instead of color
      },

      // Deep link intent filter using your canonical scheme
      intentFilters: [
        {
          action: 'VIEW',
          category: ['BROWSABLE', 'DEFAULT'],
          data: [{ scheme: 'daybreak' }], // add host/path if you need structured links
        },
      ],
    },

    ios: {
      ...config.ios,
      bundleIdentifier: 'com.paulmbugua2.mytutorapp',
      buildNumber: '1.0.0',

      // Google Sign-In native config (safe to keep since you initialize it)
      config: {
        googleSignIn: {
          reservedClientId: process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,
        },
      },

      // Register both your reversed client id and the app scheme
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleTypeRole: 'Editor',
            CFBundleURLSchemes: [
              process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,
              'daybreak', // ← match scheme above
            ],
          },
        ],
      },
    },

    web: {
      ...config.web,
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },

    splash: {
      image: './assets/splash.png',     // 2048×2048 (transparent, centered)
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },

    plugins: [
      'expo-system-ui',
      [
        'expo-build-properties',
        {
          android: {
            enableProguardInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#000000',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow $(PRODUCT_NAME) to use your location.',
        },
      ],
      // Keep only if you use @react-native-google-signin/google-signin
      isEAS && [
        '@react-native-google-signin/google-signin/app.plugin.js',
        {
          scopes: ['email', 'profile'],
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
          forceCodeForRefreshToken: true,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
          iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,
        },
      ],
    ].filter(Boolean),

    extra: {
      ...config.extra,
      EXPO_PUBLIC_BACKEND_URL:
        process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://10.42.11.111:4000',
      EXPO_PUBLIC_PROD_BACKEND_URL: process.env.EXPO_PUBLIC_PROD_BACKEND_URL,

      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,

      EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,

      eas: {
        projectId: '015ecf54-6bf2-4727-9283-1525689ccade',
      },
    },

    updates: {
        url: 'https://u.expo.dev/015ecf54-6bf2-4727-9283-1525689ccade',
      fallbackToCacheTimeout: 0,
      checkAutomatically: 'ON_LOAD',
    },

    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
    },
  };
}
