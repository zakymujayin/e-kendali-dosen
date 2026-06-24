import nextPlugin from "@next/eslint-plugin-next"
import tseslint from "typescript-eslint"
import reactHooksPlugin from "eslint-plugin-react-hooks"

export default tseslint.config(
  tseslint.configs.recommended,
  {
    ignores: [".next/", "node_modules/", "public/", "*.config.*", ".opencode/", "docs/"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
)
