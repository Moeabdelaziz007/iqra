const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Recommended for Vercel/serverless optimization of API routes.
  experimental: {
    optimizePackageImports: ['@qdrant/js-client-rest', '@upstash/redis'],
  },
};

export default nextConfig;
