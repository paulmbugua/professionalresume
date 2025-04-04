const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Map the '@shared' alias to the packages/shared folder
config.resolver.extraNodeModules = {
  '@shared': path.resolve(__dirname, 'packages/shared'),
};

module.exports = config;
