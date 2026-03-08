/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // App Hosting supports Next.js image optimisation — only disable for static exports.
    // Allow Firebase Storage signed URL domains so <Image> can optimise report photos.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
}

export default nextConfig
