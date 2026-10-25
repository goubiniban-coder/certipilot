import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Certificate PDFs are rendered in Node.js, outside the bundler.
  serverExternalPackages: ["@react-pdf/renderer"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The camera is used to take candidate photos; nothing else.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
  experimental: {
    // Candidate photos (5 MB max) and CSV imports go through server actions.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
