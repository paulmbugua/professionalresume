// apps/mobile/metro.config.js
const { getDefaultConfig } = require('@expo/metro-config'); // Updated import
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Get the default Expo Metro config
const config = getDefaultConfig(projectRoot);

// Customizations
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;