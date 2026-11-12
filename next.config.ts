import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/reset-password", headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "no-store" },
    ] }];
  },
  turbopack: {
    rules: {
      // Keep CSS Modules on Next.js's built-in CSS pipeline.
      "globals.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  output: "standalone",
};

export default nextConfig;
