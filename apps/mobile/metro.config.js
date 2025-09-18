// apps/mobile/metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot   = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

module.exports = (async () => {
  const config = await getDefaultConfig(projectRoot);

  // Watch the monorepo root for shared code
  config.watchFolders = [workspaceRoot];

  // Resolve modules from both mobile/node_modules and root/node_modules
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ];
  config.resolver.disableHierarchicalLookup = true;

  // Map all imports to the root node_modules first
  config.resolver.extraNodeModules = new Proxy(
    {},
    {
      get: (_, name) =>
        path.resolve(workspaceRoot, 'node_modules', name),
    }
  );

  return config;
})();
