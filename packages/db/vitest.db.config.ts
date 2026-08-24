import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    poolOptions: {
      threads: { singleThread: true },
    },
    fileParallelism: false,
  },
});
