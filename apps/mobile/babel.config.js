// apps/mobile/babel.config.js
module.exports = function (api) {
  api.cache(true);
  const isProd = process.env.NODE_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Expo Router transforms
      'expo-router/babel',

      // Monorepo aliasing for Metro (must mirror your TS/Vite aliases)
      ['module-resolver', {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        alias: {
          '@': './src',

          // Canonical shared aliases (flat layout)
          '@mytutorapp/shared': '../../packages/shared',
          '@mytutorapp/shared/types': '../../packages/shared/types/index.ts',

          // (Optional) legacy alias you used before
          '@shared': '../../packages/shared',
          '@shared/types': '../../packages/shared/types/index.ts',
        },
      }],

      // NativeWind (tailwind-rn) transform
      'nativewind/babel',

      // strip console.* in production builds
      ...(isProd ? ['transform-remove-console'] : []),

      // MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
