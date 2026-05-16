import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow images from github.com for repo avatars if needed later
  images: {
    domains: ["github.com", "avatars.githubusercontent.com"],
  },
};

export default nextConfig;