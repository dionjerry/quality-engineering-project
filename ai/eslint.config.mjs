import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

const typedConfigs = tseslint.configs.strictTypeChecked.map((config) => ({
  ...config,
  files: ["**/*.ts"],
}));

export default [
  { ignores: ["node_modules/", "reports/"] },
  eslint.configs.recommended,
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        document: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        URL: "readonly",
      },
    },
  },
  ...typedConfigs,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
