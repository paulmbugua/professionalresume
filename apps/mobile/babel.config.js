// apps/mobile/babel.config.js
const path = require('path');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          extensions: [
            '.tsx',
            '.ts',
            '.js',
            '.jsx',
            '.json',
          ],
          alias: {
            // Force single copies from the app's node_modules
            react: path.resolve(__dirname, 'node_modules/react'),
            'react-native': path.resolve(__dirname, 'node_modules/react-native'),
            '@tanstack/react-query': path.resolve(
              __dirname,
              'node_modules/@tanstack/react-query'
            ),

            // Monorepo convenience (optional)
            '@mytutorapp/shared': path.resolve(__dirname, '../../packages/shared'),
            '@shared': path.resolve(__dirname, '../../packages/shared'),
          },
        },
      ],

      // MUST be last
      'react-native-reanimated/plugin',
    ],
  };
};
