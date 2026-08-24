import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    include: ["tests/**/*.db.test.ts"],
    globalSetup: fileURLToPath(new URL("./tests/global-setup.ts", import.meta.url)),
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
