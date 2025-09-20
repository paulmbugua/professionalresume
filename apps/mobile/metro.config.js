// apps/mobile/metro.config.js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config'); // SDK 54+

const projectRoot   = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..'); // monorepo root

/** @type {import('metro-config').ConfigT} */
const config = getDefaultConfig(projectRoot);

// 1) Watch your monorepo root so local packages rebuild
config.watchFolders = Array.from(new Set([
  ...(config.watchFolders || []),
  workspaceRoot,
]));

// 2) Resolve modules from THIS app first, then monorepo root
config.resolver = {
  ...(config.resolver || {}),
  nodeModulesPaths: [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ],

  // ⬇️ Do NOT set disableHierarchicalLookup; leave default (false) for Expo Doctor
  // disableHierarchicalLookup: true, // ← remove this

  // Your shared package aliases
  alias: {
    ...(config.resolver?.alias || {}),
    '@mytutorapp/shared': path.resolve(workspaceRoot, 'packages/shared'),
    '@shared': path.resolve(workspaceRoot, 'packages/shared'),
  },

  // Ensure these resolve from the app (avoid duplicate React/contexts)
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules || {}),
    react: path.resolve(projectRoot, 'node_modules/react'),
    'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
    '@tanstack/react-query': path.resolve(projectRoot, 'node_modules/@tanstack/react-query'),
  },
};

module.exports = config;
