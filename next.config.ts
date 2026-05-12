/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@lancedb/lancedb', 'sharp'],
  typescript: {
    // ignoreBuildErrors: true,
  },
  transpilePackages: ['bcrypt'],
};

export default nextConfig;
