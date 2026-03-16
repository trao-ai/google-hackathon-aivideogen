const path = require("path");

/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: __dirname,
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: path.resolve(__dirname, "tsconfig.json") }],
  },
  moduleNameMapper: {
    "^@atlas/shared$": path.resolve(__dirname, "../shared/src/index"),
  },
};
