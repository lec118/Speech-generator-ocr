/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    typedRoutes: true
  },
  transpilePackages: ["@repo/core", "@repo/ui"],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Tesseract.js를 클라이언트에서만 로드
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    // Tesseract.js를 외부 패키지로 표시 (서버에서 번들링하지 않음)
    if (isServer) {
      config.externals = [...(config.externals || []), 'tesseract.js'];
    }
    return config;
  },
};

export default nextConfig;
