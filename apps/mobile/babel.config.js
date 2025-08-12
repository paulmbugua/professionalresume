// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // These two ensure Reanimated's plugin can resolve/transform modern syntax
      '@babel/plugin-proposal-optional-chaining',
      '@babel/plugin-proposal-nullish-coalescing-operator',

      // strip console in prod (your existing rule)
      ...(process.env.NODE_ENV === 'production' ? ['transform-remove-console'] : []),

      // 👇 MUST BE LAST
      'react-native-reanimated/plugin',
    ],
  };
};
