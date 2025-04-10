// babel.config.cjs (at mytutorapp/ root)
const path = require('path');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          // Use an absolute path for the alias:
          alias: {
            '@shared': path.resolve(__dirname, 'packages/shared'),
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      ],
    ],
  };
};
