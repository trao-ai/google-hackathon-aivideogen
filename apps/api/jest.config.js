const path = require("path");

/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: __dirname,
  testMatch: ["**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: path.resolve(__dirname, "tsconfig.json"), diagnostics: false }],
  },
  moduleNameMapper: {
    "^@atlas/db$": path.resolve(__dirname, "../../packages/db/src/index"),
    "^@atlas/shared$": path.resolve(__dirname, "../../packages/shared/src/index"),
    "^@atlas/integrations$": path.resolve(__dirname, "../../packages/integrations/src/index"),
    "^@atlas/prompts$": path.resolve(__dirname, "../../packages/prompts/src/index"),
    "^@atlas/style-system$": path.resolve(__dirname, "../../packages/style-system/src/index"),
    "^@atlas/cost-estimation$": path.resolve(__dirname, "../../packages/cost-estimation/src/index"),
    "^better-auth/node$": path.resolve(__dirname, "src/__tests__/integration/__mocks__/better-auth-node"),
    "^better-auth/adapters/prisma$": path.resolve(__dirname, "src/__tests__/integration/__mocks__/better-auth-adapters-prisma"),
    "^better-auth$": path.resolve(__dirname, "src/__tests__/integration/__mocks__/better-auth"),
  },
};
