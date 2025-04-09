/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires */

const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// In newer versions of Metro, use 'blockList' instead of calling exclusionList.
// Here, we simply provide an array of regex patterns to block (e.g., react-router-dom).
config.resolver.blockList = [/react-router-dom/];

module.exports = config;
