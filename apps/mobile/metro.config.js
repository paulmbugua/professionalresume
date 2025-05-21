// apps/mobile/metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

// 1) Pull in Expo's defaults
const config = getDefaultConfig(__dirname);

// 2) Watch your monorepo root
config.watchFolders = [path.resolve(__dirname, '..', '..')];

// 3) Resolve from both node_modules locations
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '..', '..', 'node_modules'),
];

// 4) Disable walking up outside those
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
