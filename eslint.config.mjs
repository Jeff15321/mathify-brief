import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Route modules are entry points. Interactive screens and their dependencies are browser-safe.
const pageFiles = ["./src/app/*.{ts,tsx,js,jsx}", "./src/app/!(api)/**/*"];
const browserDirectories = ["./src/components", "./src/client", "./src/contracts", "./src/schemas"];
const browserFiles = browserDirectories.map(directory => directory.slice(2) + "/**/*.{js,jsx,ts,tsx}");
const staticImports = [
  { selector: "TSImportType", message: "Use a top-level import type so the dependency is checked." },
  { selector: "ImportExpression[source.type!='Literal']", message: "Use a string literal for a lazy-loaded module." },
  { selector: "CallExpression[callee.name='require']", message: "Use an ES module import in application code." },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...staticImports],
      "import/no-restricted-paths": ["error", {
        basePath: import.meta.dirname,
        zones: [
          {
            target: [...browserDirectories, ...pageFiles],
            from: ["./src/server", "./src/app/api", "./node_modules/@anthropic-ai/sdk"],
            message: "Use the public HTTP client from a screen.",
          },
          {
            target: "./src/components",
            from: "./src",
            except: ["components", "client", "contracts", "schemas"],
          },
          {
            target: pageFiles,
            from: "./src",
            except: ["app", "components", "client", "contracts", "schemas"],
            message: "Compose the screen at the route entry point.",
          },
          {
            target: "./src/components/shared",
            from: "./src/components",
            except: ["shared"],
            message: "Shared components cannot depend on a feature screen.",
          },
          {
            target: "./src/client",
            from: "./src",
            except: ["client", "contracts", "schemas"],
          },
          {
            target: ["./src/contracts", "./src/schemas"],
            from: "./src",
            except: ["contracts", "schemas"],
          },
          {
            target: ["./src/server", "./src/app/api"],
            from: "./src",
            except: ["server", "contracts", "schemas"],
            message: "Services and HTTP handlers depend on server code and data contracts.",
          },
          {
            target: "./src/app/api",
            from: ["./src/server/storage", "./src/server/ai"],
            message: "Call the feature service from the HTTP handler.",
          },
          {
            target: ["./src/app/api", "./src/server/!(ai)/**/*", "./src/server/*.{ts,js}"],
            from: "./node_modules/@anthropic-ai/sdk",
            message: "Use the AI provider interface.",
          },
          {
            target: ["./src/server/!(storage)/**/*", "./src/server/*.{ts,js}"],
            from: "./src/server/storage/local-*.ts",
            message: "Use the store interfaces and factory.",
          },
          {
            target: "./src",
            from: ["./tests", "./scripts"],
            message: "Application code cannot depend on test fixtures or development scripts.",
          },
        ],
      }],
    },
  },
  {
    files: [...browserFiles, ...pageFiles.map(pattern => pattern.slice(2))],
    rules: {
      "import/no-nodejs-modules": "error",
    },
  },
  {
    files: ["src/app/api/**/*.{ts,js}", "src/server/**/*.{ts,js}"],
    ignores: ["src/server/storage/**"],
    rules: {
      "no-restricted-syntax": ["error", ...staticImports, {
        selector: "[source.value='fs'], [source.value='node:fs'], [source.value='fs/promises'], [source.value='node:fs/promises']",
        message: "Keep filesystem access in a storage adapter.",
      }],
    },
  },
  {
    rules: {
      // Allow intentionally unused parameters when prefixed with an underscore.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
