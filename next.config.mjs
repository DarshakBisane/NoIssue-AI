/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    // If BACKEND_URL is set (e.g. pointing to Render), proxy all /api requests to Render
    if (process.env.BACKEND_URL) {
      const backendUrl = process.env.BACKEND_URL.replace(/\/$/, '');
      return [
        {
          source: '/api/:path*',
          destination: `${backendUrl}/api/:path*`,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
