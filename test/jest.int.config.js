// jest.config.js
module.exports = {
  rootDir: process.env.PWD,
  globalSetup: './test/setup.js',
  bail: 1,
  clearMocks: true,
  resetModules: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'core/**/*.js'
  ],
  coverageReporters: ['json', 'html'],
  coverageDirectory: 'coverage',
  testRegex: '.*.int.test.js$'
}
