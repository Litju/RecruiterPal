import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals.coreWebVitals,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "warn",
    },
  },
  globalIgnores([".next/**", "node_modules/**", "out/**"]),
]);

export default eslintConfig;
