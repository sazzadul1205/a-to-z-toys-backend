export default {
  testEnvironment: "node",
  transform: {},
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