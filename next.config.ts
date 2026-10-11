import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Static CSP: Partial Prerendering is incompatible with per-request nonces
// (see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md),
// so inline scripts and styles are allowed. Everything else is same-origin plus
// this project's Supabase host (REST, auth, storage, realtime over wss).
// Google sign-in is a top-level redirect through Supabase, not a subresource.
const isDev = process.env.NODE_ENV !== "production";
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();
const supabaseWs = supabaseOrigin.replace(/^https:/, "wss:");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // The review screen shows the user's own bill from a short-lived signed
  // Supabase Storage URL.
  `img-src 'self' blob: data: ${supabaseOrigin}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWs}${isDev ? " ws://localhost:*" : ""}`.trim(),
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  { key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Uploads are one file (max 10 MB) per request; the proxy buffers the body
    // and truncates past this limit, so leave room for multipart overhead.
    proxyClientMaxBodySize: "11mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
