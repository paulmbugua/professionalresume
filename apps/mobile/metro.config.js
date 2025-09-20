// apps/mobile/metro.config.js
const path = require('path');
const { getDefaultConfig } = require('@expo/metro-config');

const projectRoot   = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..'); // monorepo root

/** @type {import('metro-config').ConfigT} */
const config = getDefaultConfig(projectRoot);

// Watch the workspace (so symlinked packages rebuild)
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), workspaceRoot]));

// Symlink-friendly flags (Expo SDK 54+)
config.resolver = config.resolver || {};
config.resolver.unstable_enableSymlinks = true;
config.resolver.unstable_enablePackageExports = true;

// Force these to resolve from THIS app (avoid duplicate React / contexts)
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  '@tanstack/react-query': path.resolve(projectRoot, 'node_modules/@tanstack/react-query'),
};

// Your shared package aliases
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  '@mytutorapp/shared': path.resolve(workspaceRoot, 'packages/shared'),
  '@shared': path.resolve(workspaceRoot, 'packages/shared'),
};

// Optional hardening: prevent Metro from climbing above projectRoot
// config.resolver.disableHierarchicalLookup = true;

module.exports = config;
