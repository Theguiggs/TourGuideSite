import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // E2E tests + scripts (not Next.js code)
    "e2e/**",
    "scripts/**",
    "playwright.config.ts",
    "coverage/**",
    // Python microservice (venv contains JS files that aren't ours)
    "microservice/**",
    // Design source files copied from canvas — use globals (TGEyebrow,
    // WizardShell, etc.) that don't exist as imports. Reference material only.
    "docs/design/**",
    // Visual regression baseline tests + utility scripts
    "tests/**",
    // Newdesign source (raw user input, not real code)
    "newdesign/**",
  ]),
]);

export default eslintConfig;
