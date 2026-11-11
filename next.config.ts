import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/reset-password", headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "no-store" },
    ] }];
  },
  /* config options here */
  turbopack: {
    rules: {
      // Only the Tailwind entry needs this loader. Preserve Next.js CSS Module exports.
      "globals.css": {
        loaders: ["@tailwindcss/turbopack"],
      },
    },
  },
};

export default nextConfig;
