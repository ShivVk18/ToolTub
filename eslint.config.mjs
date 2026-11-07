import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

/**
 * Layers from docs/agent/03_ENGINEERING_STANDARDS.md §2.2.
 * Rules start as warnings while the code is migrated; each refactor PR tightens them.
 */
const LAYERS = [
  { type: "app", pattern: "src/app" },
  { type: "components", pattern: "src/components" },
  { type: "tools", pattern: "src/tools" },
  { type: "workers", pattern: "src/workers" },
  { type: "registry", pattern: "src/registry" },
  { type: "engines", pattern: "src/lib/engines" },
  { type: "lib", pattern: "src/lib" },
  { type: "server", pattern: "src/server" },
];

const allow = (from, to) => ({ from: { element: { type: from } }, allow: { to: { element: { types: to } } } });

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Third-party engines copied from node_modules at install time (minified, not our code).
    "public/vendor/**",
    "worker/node_modules/**",
    "scripts/**",
    "reports/**",
    "coverage/**",
    // Generated test output (gitignored): Playwright's minified trace viewer broke verify after a failed run.
    "playwright-report/**",
    "test-results/**",
    ".lighthouseci/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/no-unescaped-entities": "off",
      // Re-enabled in refactor/render-purity once the render-time violations are fixed.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
    },
  },
  // Architecture: no import cycles, layer boundaries, accessibility.
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": { typescript: { project: "./tsconfig.json" }, node: true },
      "boundaries/elements": LAYERS,
      "boundaries/include": ["src/**/*"],
    },
    rules: {
      "import/no-cycle": ["error", { maxDepth: 10, ignoreExternal: true }],
      "boundaries/dependencies": [
        "warn",
        {
          default: "disallow",
          policies: [
            allow("app", ["app", "components", "tools", "workers", "registry", "engines", "lib", "server"]),
            allow("components", ["components", "tools", "registry", "engines", "lib"]),
            allow("tools", ["components", "tools", "workers", "registry", "engines", "lib"]),
            allow("workers", ["workers", "engines", "lib"]),
            allow("registry", ["registry", "lib"]),
            allow("engines", ["engines"]),
            allow("lib", ["lib", "engines", "registry", "workers"]),
            allow("server", ["server", "lib", "registry"]),
          ],
        },
      ],
      ...Object.fromEntries(
        Object.entries((await import("eslint-plugin-jsx-a11y")).default.configs.recommended.rules)
          .filter(([, v]) => (Array.isArray(v) ? v[0] : v) !== "off")
          .map(([r, v]) => [r, Array.isArray(v) ? ["warn", ...v.slice(1)] : "warn"]),
      ),
    },
  },
]);

export default eslintConfig;
