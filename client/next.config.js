/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Solana wallet adapters require this for browser bundling
    config.resolve.fallback = { fs: false, path: false, os: false };
    return config;
  },
};

module.exports = nextConfig;
