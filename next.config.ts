import type { NextConfig } from "next";

const BACKEND_URL =
  process.env.HERMES_BACKEND_URL || "http://localhost:8787";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${BACKEND_URL}/health`,
      },
    ];
  },
  transpilePackages: [
    "streamdown",
    "@streamdown/code",
    "@streamdown/mermaid",
    "@streamdown/math",
    "@streamdown/cjk",
  ],
};

export default nextConfig;
