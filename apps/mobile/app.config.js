// apps/mobile/app.config.js
import 'dotenv/config';

export default function expoConfig({ config }) {
  const isEAS = process.env.EAS_BUILD === 'true';
  const isDev = process.env.NODE_ENV !== 'production' && !isEAS;

  return {
    ...config,
    name: 'DayBreak',
    slug: 'funzasasa',
    version: '1.0.0',
    scheme: 'daybreak',
    runtimeVersion: { policy: 'sdkVersion' },
    userInterfaceStyle: 'automatic',

    // Icon/splash paths are RELATIVE to apps/mobile/
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },

    assetBundlePatterns: ['**/*'],

    android: {
      ...config.android,
      package: 'com.paulmbugua2.mytutorapp',
      versionCode: 1,
      // Keep only what you need. RECORD_AUDIO for TTS mic features if any.
      permissions: ['INTERNET', 'CAMERA', 'RECORD_AUDIO'],
      googleServicesFile: './google-services.json',

      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon-foreground.png',
        monochromeImage: './assets/adaptive-icon-monochrome.png',
        backgroundColor: '#FFFFFF',
      },

      intentFilters: [
        {
          action: 'VIEW',
          category: ['BROWSABLE', 'DEFAULT'],
          data: [{ scheme: 'daybreak' }],
        },
      ],
    },

    ios: {
      ...config.ios,
      bundleIdentifier: 'com.paulmbugua2.mytutorapp',
      buildNumber: '1.0.0',
      config: {
        googleSignIn: {
          reservedClientId: process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,
        },
      },
      // ✅ allow background audio for narration
      infoPlist: {
        ...(config?.ios?.infoPlist ?? {}),
        UIBackgroundModes: [
          ...new Set([...(config?.ios?.infoPlist?.UIBackgroundModes ?? []), 'audio']),
        ],
        CFBundleURLTypes: [
          {
            CFBundleTypeRole: 'Editor',
            CFBundleURLSchemes: [
              process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,
              'daybreak',
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

    plugins: [
      // keep your existing plugins
      'expo-system-ui',

      // Build properties
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: isDev, // dev only
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

      // ➕ ADD THESE (required by Expo CLI prompt)
      'expo-audio',
      'expo-video',

      // Only add Google Sign-In native config on EAS builds/dev clients
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
        process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://10.0.2.2:4000',
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

      eas: { projectId: '015ecf54-6bf2-4727-9283-1525689ccade' },
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
