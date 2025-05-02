// apps/mobile/metro.config.js

const { getDefaultConfig } = require('@expo/metro-config');

const path = require('path');
const workspaceRoot = path.resolve(__dirname, '../../');
const projectRoot = __dirname;

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

if (!config.resolver.assetExts.includes('cjs')) {
  config.resolver.assetExts.push('cjs');
}

module.exports = config;
