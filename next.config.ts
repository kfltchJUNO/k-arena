/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // 개발 중에는 PWA 비활성화
});

const nextConfig = {
  reactStrictMode: false, // 빌드 오류 방지용 (필요시 true)
};

module.exports = withPWA(nextConfig);