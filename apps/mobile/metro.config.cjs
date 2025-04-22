// apps/mobile/metro.config.js

const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../../');

// Create default config
const config = getDefaultConfig(projectRoot);

// Add support for monorepo packages
config.watchFolders = [
  path.resolve(workspaceRoot, 'packages/shared'), // shared code
  path.resolve(workspaceRoot, 'node_modules'),    // root node_modules
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Optional: Add extra resolver settings if needed
// config.resolver.resolverMainFields = ['sbmodern', 'browser', 'main'];

module.exports = config;
