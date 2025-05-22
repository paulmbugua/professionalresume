// apps/mobile/metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot   = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1) Watch the repo root so shared code is picked up
config.watchFolders = [
  workspaceRoot,
];

// 2) Tell Metro where to look for modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),        // mobile/node_modules
  path.resolve(workspaceRoot, 'node_modules'),      // repo-root node_modules
];

config.resolver.disableHierarchicalLookup = true;    // don’t walk higher directories

// 3) Force all imports to resolve first against the repo root
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (_target, name) => {
      // e.g. import 'expo-file-system' => workspaceRoot/node_modules/expo-file-system
      return path.resolve(workspaceRoot, 'node_modules', name);
    },
  }
);

module.exports = config;
