/** @type {import('next').NextConfig} */
const backendInternal =
  process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000";

const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },
  async redirects() {
    return [
      { source: "/sheet", destination: "/visualizer", permanent: false },
      { source: "/sheet/play", destination: "/visualizer/play", permanent: false },
    ];
  },
  /** Browser hits same origin (:3000); dev server forwards to FastAPI on this machine. */
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${backendInternal.replace(/\/$/, "")}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
