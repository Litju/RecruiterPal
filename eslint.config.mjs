import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  globalIgnores(["node_modules/**", ".next/**", "dist/**", "coverage/**", "playwright-report/**", "test-results/**", "docs/build-contract/**", "packages/db/drizzle/**"]),
]);
