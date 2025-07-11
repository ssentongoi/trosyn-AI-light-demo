module.exports = {
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
