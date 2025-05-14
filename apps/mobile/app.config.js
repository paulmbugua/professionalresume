// apps/mobile/app.config.js
import 'dotenv/config';

export default ({ config }) => {
  const isRouterEnabled = true;

  return {
    ...config,
    name: 'FunzaSasa',
    slug: 'funzasasa',
    version: '1.0.0',
    scheme: 'funzasasa',
    runtimeVersion: { policy: 'sdkVersion' },
    userInterfaceStyle: 'automatic',

    // Android Config
    android: {
      ...config.android,
      package: 'com.paulmbugua2.mytutorapp',
      versionCode: 1,
      permissions: ['INTERNET', 'CAMERA', 'RECORD_AUDIO'],
      googleServicesFile: './google-services.json', // Path to your google-services.json
      usesCleartextTraffic: true,
      // Add adaptive icon if needed
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFFFFF',
      },
    },

    // iOS Config
    ios: {
      ...config.ios,
      bundleIdentifier: 'com.paulmbugua2.mytutorapp',
      buildNumber: '1.0.0',
      config: {
        googleSignIn: {
          // Must match REVERSED_CLIENT_ID from GoogleService-Info.plist
          reservedClientId: process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,
        },
      },
      infoPlist: {
        // Ensure URL scheme is added (auto-added by plugin during prebuild)
        CFBundleURLTypes: [
          {
            CFBundleTypeRole: 'Editor',
            CFBundleURLSchemes: [
              process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID,
              'funzasasa', // Your custom scheme
            ],
          },
        ],
      },
    },

    // Web Config
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
      [
        '@react-native-google-signin/google-signin',
        {
          scopes: ['email', 'profile'],
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, // Web Client (Type 3)
          //iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, // iOS Client (from plist)
          //iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_REVERSED_CLIENT_ID, // Reversed iOS ID
          offlineAccess: true,
          forceCodeForRefreshToken: true,
        },
      ],
    ].filter(Boolean),

    // Environment Variables
    extra: {
      ...config.extra,
      EXPO_PUBLIC_BACKEND_URL:
        process.env.EXPO_PUBLIC_BACKEND_URL ?? 'http://192.168.68.47:4000',
      EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
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
};