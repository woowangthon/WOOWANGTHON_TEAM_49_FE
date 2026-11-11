import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    async headers() {
        return [{
            source: "/reset-password", headers: [
                {key: "Referrer-Policy", value: "no-referrer"},
                {key: "Cache-Control", value: "no-store"},
            ]
        }];
    },
    /* config options here */
    turbopack: {
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
    output: "standalone",
};

export default nextConfig;
