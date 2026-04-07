/** @type {import('next').NextConfig} */
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
};

module.exports = nextConfig;
