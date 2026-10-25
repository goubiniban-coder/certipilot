import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Candidate photos (5 MB max) and CSV imports go through server actions.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
