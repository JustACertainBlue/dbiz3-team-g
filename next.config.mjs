/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  // ADR 0002: the app renders plain <img> and never uses next/image, so the built-in Image Optimizer is
  // switched off. This closes the Next 14 Image Optimization advisories (RCE via AVIF/SVG, DoS, disk-cache
  // growth) until the upgrade to Next 15.5.x after MVP RC.
  images: { unoptimized: true },
};

export default nextConfig;
