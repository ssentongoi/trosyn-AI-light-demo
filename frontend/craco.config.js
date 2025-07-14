const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Completely disable ESLint to avoid the eslint-loader error
      webpackConfig.plugins = webpackConfig.plugins.filter(
        plugin => !['ESLintWebpackPlugin', 'ESLintWebpackPlugin_2'].includes(plugin.constructor.name)
      );
      
      // Remove any existing eslint-loader configurations
      if (webpackConfig.module && webpackConfig.module.rules) {
        webpackConfig.module.rules = webpackConfig.module.rules.filter(
          rule => !(rule.use && Array.isArray(rule.use) && rule.use.some(use => use.loader && use.loader.includes('eslint-loader')))
        );
      }
      webpackConfig.resolve.extensions = [...webpackConfig.resolve.extensions, '.js'];
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        'src': path.resolve(__dirname, 'src'),
        '@mui/material/styles': path.resolve(__dirname, 'node_modules/@mui/material/styles/index.js'),
      };
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "fs": false,
        "path": false,
        "os": false,
      };

      // Add rule to set fullySpecified: false for .mjs and .js files
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });

      return webpackConfig;
    },
    alias: {
      'src': path.resolve(__dirname, 'src'),
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
    },
  },
  jest: {
    configure: (jestConfig) => {
      jestConfig.transformIgnorePatterns = [
        '/node_modules/(?!axios)/'
      ];
      jestConfig.setupFilesAfterEnv = ['<rootDir>/src/setupTests.js'];
      return jestConfig;
    },
  },
};
