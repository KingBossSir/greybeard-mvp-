import type { NextConfig } from "next";

// Hardened defaults. CSP is also applied in middleware with a per-request nonce.
const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone", // for the staging Docker image

  experimental: {
    serverActions: { bodySizeLimit: "8mb" }, // passport images
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(self), payment=()" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default config;
