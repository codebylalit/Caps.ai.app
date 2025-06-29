module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-transform-runtime', {
        helpers: true,
        regenerator: true,
        corejs: false,
        version: '^7.20.0'
      }],
      'react-native-reanimated/plugin',
      '@babel/plugin-transform-modules-commonjs'
    ]
  };
}; 