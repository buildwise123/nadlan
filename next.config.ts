import type { NextConfig } from "next";

// Cache Components and Partial Prefetching are intentionally OFF.
// This is a single-user app whose pages read the session and live Airtable
// data on every request, so the static-shell model adds complexity without
// benefit. See README "Technical decisions".
const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
