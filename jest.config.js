/** @type {import('jest').Config} */
const config = {
  // Gunakan 'node' environment karena ini backend service
  testEnvironment: "node",

  // Pattern file test
  testMatch: ["**/__tests__/**/*.test.js"],

  // Coverage configuration
  collectCoverageFrom: ["src/services/**/*.js", "!src/services/__tests__/**"],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ["text", "lcov", "html"],

  // Verbose output untuk melihat setiap test case
  verbose: true,
};

export default config;
