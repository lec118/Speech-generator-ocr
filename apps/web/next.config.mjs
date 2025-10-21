/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  transpilePackages: ["@repo/core", "@repo/ui"]
};

export default nextConfig;
