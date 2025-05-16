// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add TypeScript and JavaScript extensions
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx', 'mjs', 'cjs'];

// Add URL polyfill configuration
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  url: require.resolve('url/'),
};

module.exports = config; 