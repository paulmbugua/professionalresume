// apps/mobile/metro.config.js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot   = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..'); // monorepo root

/** @type {import('metro-config').ConfigT} */
const config = getDefaultConfig(projectRoot);

/**
 * 1) Watch the monorepo root so Metro picks up changes in shared packages
 */
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), workspaceRoot]));

/**
 * 2) Resolve modules from THIS app first, then from the workspace root.
 *    This keeps singletons for react, react-native, and react-query.
 */
config.resolver = {
  ...(config.resolver || {}),
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],

  // Keep aliases for your shared package
  alias: {
    ...(config.resolver?.alias || {}),
    '@mytutorapp/shared': path.resolve(workspaceRoot, 'packages/shared'),
    '@shared': path.resolve(workspaceRoot, 'packages/shared'),
  },

  // Force single copies of these libs from the app's node_modules
  extraNodeModules: {
  ...(config.resolver?.extraNodeModules || {}),
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  '@tanstack/react-query': path.resolve(projectRoot, 'node_modules/@tanstack/react-query'),
  '@tanstack/query-core': path.resolve(projectRoot, 'node_modules/@tanstack/query-core'), // ← ADD THIS
},

  // 🚫 Removed: unstable_enableSymlinks
  // Let Metro use its default behavior (undefined), which expo-doctor expects.
};

module.exports = config;
