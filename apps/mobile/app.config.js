// apps/mobile/app.config.js
import 'dotenv/config';

export default ({ config }) => {
  const isRouterEnabled = true;
  const isAndroid = process.env.EAS_BUILD_PLATFORM === 'android';

  return {
    ...config,
    name: 'FunzaSasa',
    slug: 'funzasasa',
    version: '1.0.0',
    scheme: 'funzasasa',
    runtimeVersion: { policy: 'sdkVersion' },
    userInterfaceStyle: 'automatic',

    // Android-specific config
    android: {
      ...config.android,
      package: 'com.paulmbugua2.mytutorapp',
      versionCode: 1,
      permissions: ['INTERNET', 'CAMERA', 'RECORD_AUDIO'],
      googleServicesFile: './google-services.json',
      usesCleartextTraffic: true,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
    },

    // iOS-specific config (ignored on Android builds)
    ios: !isAndroid
      ? {
          ...config.ios,
          bundleIdentifier: 'com.paulmbugua2.mytutorapp',
          buildNumber: '1.0.0',
          config: {
            googleSignIn: {
              reservedClientId:
                process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,
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
        }
      : undefined,

    // Web config
    web: {
      ...config.web,
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },

    // Plugins
    plugins: [
      isRouterEnabled && 'expo-router',
      'expo-system-ui',

      // Splash screen
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],

      // Location
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow $(PRODUCT_NAME) to use your location.',
        },
      ],

      // Google Sign-In (always include iOS fields)
      [
        '@react-native-google-signin/google-signin',
        {
          scopes: ['email', 'profile'],
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
          offlineAccess: true,
          forceCodeForRefreshToken: true,
          iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
          iosUrlScheme:
            process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,
        },
      ],
    ].filter(Boolean),

    // Extra env vars
    extra: {
      ...config.extra,
      EXPO_PUBLIC_BACKEND_URL:
        process.env.EXPO_PUBLIC_BACKEND_URL ??
        'http://192.168.68.47:4000',
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID:
        process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,
      eas: {
        projectId: '015ecf54-6bf2-4727-9283-1525689ccade',
      },
    },

    // OTA updates
    updates: {
      url:
        'https://u.expo.dev/015ecf54-6bf2-4727-9283-1525689ccade',
      fallbackToCacheTimeout: 0,
      checkAutomatically: 'ON_LOAD',
    },

    // Experiments
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
    },
  };
};
