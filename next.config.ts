import type { NextConfig } from "next";

const fallbackUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || fallbackUrl).replace(/\/$/, "");

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "dentbridge.com",
          },
        ],
        destination: `${appUrl}/:path*`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
