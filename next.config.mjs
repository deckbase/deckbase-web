/** @type {import('next').NextConfig} */
import dotenv from "dotenv";
dotenv.config();

/**
 * Security headers (non-HSTS). Vercel adds Strict-Transport-Security on production HTTPS;
 * duplicating HSTS here can send two values — rely on the platform unless you self-host.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  allowedDevOrigins: ["dev.deckbase.co"],
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
          { key: "Cache-Control", value: "public, max-age=3600" },
          ...securityHeaders,
        ],
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
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
