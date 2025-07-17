/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },
  // Disable static generation for pages that might use browser APIs
  experimental: {
    missingSuspenseWithCSRBailout: false,
  }
}

module.exports = nextConfig
