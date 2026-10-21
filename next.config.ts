import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Disabled: conflicts with explicit `export const runtime = 'nodejs'` route segment config,
  // which this app's filesystem/Anthropic SDK routes require (IMPLEMENTATION_PLAN.md Section 4).
  cacheComponents: false,
  turbopack: {
    // Pin the workspace root so a stray lockfile in a parent directory is not picked up.
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
