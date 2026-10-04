export default {
  testEnvironment: "node",
  transform: {},
  // Must precede the test files so DATA_DIR is set before the data layer loads.
  setupFiles: ["<rootDir>/tests/setupEnv.js"],
  testMatch: ["**/tests/**/*.test.js"],
  verbose: true,
  collectCoverageFrom: [
    "controllers/**/*.js",
    "config/**/*.js",
    "models/**/*.js",
    "routes/**/*.js",
    "!**/node_modules/**",
  ],
  coveragePathIgnorePatterns: ["/node_modules/", "/data/"],
};