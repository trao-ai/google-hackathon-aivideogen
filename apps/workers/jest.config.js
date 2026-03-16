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
    "^@atlas/db$": path.resolve(__dirname, "../../packages/db/src/index"),
    "^@atlas/shared$": path.resolve(__dirname, "../../packages/shared/src/index"),
    "^@atlas/integrations$": path.resolve(__dirname, "../../packages/integrations/src/index"),
    "^@atlas/prompts$": path.resolve(__dirname, "../../packages/prompts/src/index"),
    "^@atlas/style-system$": path.resolve(__dirname, "../../packages/style-system/src/index"),
  },
};
