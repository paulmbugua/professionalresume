// apps/mobile/metro.config.js
const { getDefaultConfig } = require('@expo/metro-config')
const path = require('path')

const projectRoot   = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

module.exports = (async () => {
  // 1) Load Expo's default Metro config
  const config = await getDefaultConfig(projectRoot)

  // 2) Watch your monorepo root so shared/ code is picked up
  config.watchFolders = [workspaceRoot]

  // 3) Resolve modules both from mobile/node_modules and root/node_modules
  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ]
  config.resolver.disableHierarchicalLookup = true

  // 4) Map every import into your repo root's node_modules first
  config.resolver.extraNodeModules = new Proxy(
    {},
    {
      get: (_target, name) =>
        path.resolve(workspaceRoot, 'node_modules', name),
    }
  )

  return config
})()
