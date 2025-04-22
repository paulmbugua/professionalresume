// apps/mobile/metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../../');

// ✅ Correct: Get and extend the base config without replacing it
const config = getDefaultConfig(projectRoot);

// ✅ Mutate this config, don’t recreate or wrap it
config.watchFolders = [
  path.resolve(workspaceRoot, 'packages/shared'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// ✅ Export exactly the modified default config
module.exports = config;
