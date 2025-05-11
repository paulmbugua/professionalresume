// apps/mobile/metro.config.js
console.log('🚀 Loaded metro.config.js from apps/mobile');

const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch your shared workspace root so changes there get picked up
config.watchFolders = [workspaceRoot];

// Ensure modules are resolved from both app and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Prevent Metro from walking up the filesystem for modules
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
