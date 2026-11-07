/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  // Next 14 needs this flag to run src/instrumentation.ts at server start (hosted test accounts, ADR 0001).
  experimental: { instrumentationHook: true },
};

export default nextConfig;
