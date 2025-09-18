// apps/mobile/metro.config.js
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config'); // ← prefer 'expo/metro-config'

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

module.exports = (async () => {
  const config = await getDefaultConfig(projectRoot);

  // Watch the whole workspace so shared packages get picked up
  config.watchFolders = [workspaceRoot];

  // RN 0.76: use the *unstable_* flag name (the old enableSymlinks is ignored)
  config.resolver.unstable_enableSymlinks = true;

  // Resolve modules from app and root node_modules (prevents dupes)
  config.resolver.nodeModulesPaths = [
    path.join(projectRoot, 'node_modules'),
    path.join(workspaceRoot, 'node_modules'),
  ];

  // Strongly recommended in monorepos to avoid odd lookups
  config.resolver.disableHierarchicalLookup = true;

  // Some libs ship .cjs/.mjs
  const exts = config.resolver.sourceExts || [];
  for (const ext of ['cjs', 'mjs']) if (!exts.includes(ext)) exts.push(ext);
  config.resolver.sourceExts = exts;

  // Better package-exports resolution
  config.resolver.unstable_enablePackageExports = true;
  config.resolver.unstable_conditionNames = ['react-native', 'require'];

  return config;
})();
