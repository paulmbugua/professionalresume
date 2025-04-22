const rootBabelConfig = require('../../babel.config.cjs');

module.exports = function (api) {
  const base = rootBabelConfig(api);
  return {
    ...base,
    plugins: [
      ...(Array.isArray(base.plugins) ? base.plugins : []),
      'nativewind/babel',
    ],
  };
};
