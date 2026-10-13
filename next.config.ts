import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Extra hosts allowed to submit Server Actions through a tunnel/proxy.
// Leave empty in production.
const allowedActionOrigins = (process.env.SERVER_ACTIONS_ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // This folder lives inside another workspace (the Desktop has its own
  // lockfile and .eslintrc). Pin the root here so neither leaks in.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  // The project has no lint setup of its own; type checking still runs.
  eslint: { ignoreDuringBuilds: true },
  ...(allowedActionOrigins.length
    ? { experimental: { serverActions: { allowedOrigins: allowedActionOrigins } } }
    : {}),
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/c/:token*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;