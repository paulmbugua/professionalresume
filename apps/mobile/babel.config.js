// apps/mobile/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // (add any other plugins you use here)

      // MUST be last for react-native-reanimated
      'react-native-reanimated/plugin',
    ],
  };
};
