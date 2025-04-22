const rootBabelConfig = require('../../babel.config.cjs');

module.exports = function (api) {
  const base = rootBabelConfig(api);
  return {
    presets: [...(base.presets || [])],
    plugins: [
      ...(base.plugins || []),
      'nativewind/babel',
    ],
  };
};
