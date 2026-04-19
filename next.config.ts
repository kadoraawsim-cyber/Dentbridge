import type { NextConfig } from "next";

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
        destination: "https://dentbridgetr.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
