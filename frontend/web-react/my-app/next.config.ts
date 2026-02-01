import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Bỏ qua lỗi ESLint (biến không dùng, thẻ img...)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Bỏ qua lỗi TypeScript (biến any...)
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
