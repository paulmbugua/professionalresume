// apps/mobile/metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

module.exports = (async () => {
  const config = await getDefaultConfig(projectRoot);

  // Monorepo-friendly
  config.watchFolders = [workspaceRoot];
  config.resolver.enableSymlinks = true;

  // Let Metro look in both locations (app first, then root)
  config.resolver.nodeModulesPaths = [
    path.join(projectRoot, 'node_modules'),
    path.join(workspaceRoot, 'node_modules'),
  ];

  // ❌ Remove these — they break package/babel plugin resolution
  // config.resolver.disableHierarchicalLookup = true;
  // config.resolver.extraNodeModules = ...

  // Some libs ship .cjs/.mjs
  const exts = config.resolver.sourceExts || [];
  for (const ext of ['cjs', 'mjs']) if (!exts.includes(ext)) exts.push(ext);
  config.resolver.sourceExts = exts;

  // Better package exports resolution
  config.resolver.unstable_enablePackageExports = true;
  config.resolver.unstable_conditionNames = ['react-native', 'require'];

  return config;
})();
