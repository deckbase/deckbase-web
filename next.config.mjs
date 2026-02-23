/** @type {import('next').NextConfig} */
import dotenv from "dotenv";
dotenv.config();

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_REVENUECAT_WEB_API_KEY: process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY || "",
  },
  images: {
    qualities: [25, 50, 75, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Handle sql.js fs module for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
