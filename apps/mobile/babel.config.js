// apps/mobile/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [require.resolve('babel-preset-expo')],
  };
};
