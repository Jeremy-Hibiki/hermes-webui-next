import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['*.local'],
  // API proxying is handled by src/middleware.ts (sets Origin/Host headers
  // for CSRF compatibility) — no rewrites needed for /api/*.
  async rewrites() {
    return [
      {
        source: '/health',
        destination: `${process.env.HERMES_BACKEND_URL || 'http://localhost:8787'}/health`,
      },
    ];
  },
  transpilePackages: ['streamdown', '@streamdown/code', '@streamdown/mermaid', '@streamdown/math', '@streamdown/cjk'],
};

export default nextConfig;
