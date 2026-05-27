import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://14.225.212.97:5000/api/:path*', // Link gọi về VPS của bạn
      },
    ];
  },
};

export default nextConfig;
