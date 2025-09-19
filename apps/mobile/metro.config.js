const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot   = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// ✅ keep Expo defaults, then add your monorepo root once
config.watchFolders = Array.from(new Set([
  ...(config.watchFolders || []),
  workspaceRoot,
]));

// Optional: alias shared package (no undefined vars)
config.resolver = config.resolver || {};
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  '@mytutorapp/shared': path.resolve(workspaceRoot, 'packages/shared'),
  '@shared': path.resolve(workspaceRoot, 'packages/shared'),
};

// Usually you do NOT need these on SDK 54; leave defaults:
// - disableHierarchicalLookup
// - extraNodeModules Proxy

module.exports = config;
