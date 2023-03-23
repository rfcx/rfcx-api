// jest.config.js
module.exports = {
  rootDir: process.env.PWD,
  bail: 1,
  clearMocks: true,
  resetModules: true,
  collectCoverage: true,
  collectCoverageFrom: [
    'core/**/*.js'
  ],
  coverageReporters: ['json', 'html'],
  coverageDirectory: 'coverage',
  testRegex: '.*.unit.test.js$'
}
