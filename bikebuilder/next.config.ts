import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL("https://images.unsplash.com/**")],
  },
  // This app lives in a subfolder of a repo that has its own lockfile.
  turbopack: { root: __dirname },
};

export default nextConfig;
