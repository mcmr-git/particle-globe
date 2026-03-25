/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force a unique build ID on every deploy — ensures CDN never serves stale chunks
  generateBuildId: async () => String(Date.now()),
}
module.exports = nextConfig
