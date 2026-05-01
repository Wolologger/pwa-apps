module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/tests/**/*.test.js'],
  setupFiles: ['./tests/setup.js'],
  clearMocks: true,       // resetea mocks automáticamente entre tests
  restoreMocks: true,     // restaura spies tras cada test
  collectCoverageFrom: ['wapps-utils.js', 'wapps-store.js'],
  coverageReporters: ['text', 'lcov'],
  verbose: true,
};
