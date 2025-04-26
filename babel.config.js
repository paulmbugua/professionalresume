// babel.config.js (monorepo root)
const path = require('path');

module.exports = function(api) {
  api.cache(true);
  const cwd = process.cwd();
  const isMobile = cwd.includes(`${path.sep}apps${path.sep}mobile`);

  return {
    presets: [
      // 1) Expo preset; for mobile we also opt‐in to NativeWind's JSX transform
      isMobile
        ? ['babel-preset-expo', { jsxImportSource: 'nativewind' }]
        : 'babel-preset-expo',

      // 2) NativeWind is a *preset* in v4+
      isMobile && 'nativewind/babel',
    ].filter(Boolean),

    plugins: [
      // keep your shared alias everywhere
      ['module-resolver', {
        alias: {
          '@mytutorapp/shared': path.resolve(__dirname, 'packages/shared'),
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      }],

      // only if *you* use Reanimated—otherwise drop this line
      // isMobile && require('react-native-reanimated/plugin'),
    ].filter(Boolean),
  };
};
