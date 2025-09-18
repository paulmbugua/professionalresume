module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // strip all console.* calls (log, warn, info, error, etc.) in prod
      ...(process.env.NODE_ENV === 'production'
        ? ['transform-remove-console']
        : []),
    ],
  };
};
