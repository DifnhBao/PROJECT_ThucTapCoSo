import type { NextConfig } from "next";
import { apiOrigin } from "./server-api-config.cjs";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      { source: '/health/:path*', destination: `${apiOrigin()}/health/:path*` },
      {
        source: '/api/:path*',
        destination: `${apiOrigin()}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
