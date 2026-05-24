import reactPlugin from "eslint-plugin-react";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    plugins: {
      react: reactPlugin,
      "@typescript-eslint": tsPlugin,
    },
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2022,
        sourceType: "module",
      },
      globals: {
        document: "readonly",
        window: "readonly",
        console: "readonly",
        fetch: "readonly",
        HTMLElement: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        URLSearchParams: "readonly",
        FormData: "readonly",
        URL: "readonly",
        navigator: "readonly",
        globalThis: "readonly",
        process: "readonly",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
    },
  },
];
