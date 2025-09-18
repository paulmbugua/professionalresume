const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

module.exports = (async () => {
  const config = await getDefaultConfig(projectRoot);

  config.watchFolders = [workspaceRoot];
  config.resolver.unstable_enableSymlinks = true;
  config.resolver.disableHierarchicalLookup = true;
  config.resolver.nodeModulesPaths = [
    path.join(projectRoot, 'node_modules'),
    path.join(workspaceRoot, 'node_modules'),
  ];
  const exts = config.resolver.sourceExts || [];
  for (const ext of ['cjs', 'mjs']) if (!exts.includes(ext)) exts.push(ext);
  config.resolver.sourceExts = exts;
  config.resolver.unstable_enablePackageExports = true;
  config.resolver.unstable_conditionNames = ['react-native', 'require'];

  return config;
})();
