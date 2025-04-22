// babel.config.js (at mytutorapp/ root)
const path = require('path');

module.exports = function (api) {
  api.cache(true);

  // detect if we’re running inside the mobile app
  const cwd = process.cwd();
  const isMobile = cwd.includes(`${path.sep}apps${path.sep}mobile`);

  return {
    presets: [
      'babel-preset-expo',
    ],
    plugins: [
      // keep your shared alias
      ['module-resolver', {
        alias: {
          '@mytutorapp/shared': path.resolve(__dirname, 'packages/shared'),
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      }],

      // only on mobile include nativewind
      isMobile && 'nativewind/babel',
    ].filter(Boolean),
  };
};
