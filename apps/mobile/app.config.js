// apps/mobile/app.config.js
import 'dotenv/config';

export default function expoConfig({ config }) {
  const isEAS = process.env.EAS_BUILD === 'true';

  return {
    ...config,
    name: 'FunzaSasa',
    slug: 'funzasasa',
    version: '1.0.0',
    scheme: 'funzasasa',
    runtimeVersion: { policy: 'sdkVersion' },
    userInterfaceStyle: 'automatic',

    android: {
      ...config.android,
      package: 'com.paulmbugua2.mytutorapp',
      versionCode: 1,
      permissions: ['INTERNET', 'CAMERA', 'RECORD_AUDIO'],
      googleServicesFile: './google-services.json',
      usesCleartextTraffic: true,
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
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
      infoPlist: {
        CFBundleURLTypes: [
          {
            CFBundleTypeRole: 'Editor',
            CFBundleURLSchemes: [
              process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,
              'funzasasa',
            ],
          },
        ],
      },
    },

    web: {
      ...config.web,
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png',
    },

    plugins: [
      'expo-router',
      'expo-system-ui',

      // ← Added: enable Proguard/R8 & resource shrinking in release builds
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
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow $(PRODUCT_NAME) to use your location.',
        },
      ],
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
