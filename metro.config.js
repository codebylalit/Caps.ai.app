// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add custom configuration here if needed
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Add URL polyfill configuration
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  url: require.resolve('url/'),
};

module.exports = config; 