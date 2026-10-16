/** @type {import('next').NextConfig} */

// When BUILD_STANDALONE=true, generate a static export for the Electron desktop app.
// In normal dev/web mode, keep the API rewrites proxy.
const isStandalone = process.env.BUILD_STANDALONE === "true";

const nextConfig = {
  reactStrictMode: true,
  ...(isStandalone
    ? {
        output: "export",
        trailingSlash: true,
      }
    : {
        async rewrites() {
          return [
            {
              source: "/api/:path*",
              destination: "http://localhost:8000/api/:path*",
            },
          ];
        },
      }),
};

module.exports = nextConfig;
