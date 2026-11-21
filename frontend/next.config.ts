import type { NextConfig } from "next";

// Browser only ever talks to ONE origin (this Next.js server) — API calls
// are proxied server-side to the backend. Same reasoning as retail-pos:
// this keeps the session cookie first-party, avoiding the cross-origin
// cookie fragility that broke that app's very first version. NOTE: Next
// bakes the rewrite destination at build time, so in Docker this must come
// from a build ARG, not a runtime env var (see retail-pos memory).
const BACKEND_URL = process.env.BACKEND_URL ?? "https://restro.piyushassudani.in";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@restrocore/types"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self), payment=(self)" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://restro.piyushassudani.in wss://restro.piyushassudani.in ws://localhost:*; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
  // socket.io's endpoint is literally "/socket.io/" — the backend 404s on the
  // slash-less form, so Next must not redirect it.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      // Realtime push (socket.io) goes through the same origin too: in
      // production only this web server is reachable, never the backend's
      // own port. socket.io starts with long-polling, which proxies fine.
      // Literal first: an empty :path* would drop the trailing slash.
      { source: "/socket.io/", destination: `${BACKEND_URL}/socket.io/` },
      { source: "/socket.io/:path+", destination: `${BACKEND_URL}/socket.io/:path+` },
    ];
  },
};

export default nextConfig;
