// apps/mobile/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot   = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// 1) Pull in Expo’s recommended defaults
const config = getDefaultConfig(projectRoot);

// 2) Tell Metro about your monorepo workspace
config.watchFolders = [workspaceRoot];

// 3) Resolve node_modules from both the app and the repo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 4) Prevent Metro from walking up past those folders
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
