// apps/mobile/metro.config.js

const { getDefaultConfig } = require('@expo/metro-config');

// Get the default Expo config
const config = getDefaultConfig(__dirname);

// Add your custom watchFolders if needed (optional!)
const path = require('path');
const workspaceRoot = path.resolve(__dirname, '../../');

config.watchFolders = [
  path.resolve(workspaceRoot, 'packages/shared'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
