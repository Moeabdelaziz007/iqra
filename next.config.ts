/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['sharp'],
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ['bcrypt'],
};

export default nextConfig;
