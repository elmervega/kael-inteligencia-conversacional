import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Compresión gzip/brotli automática → reduce el payload de JS/CSS ~30-40%.
  compress: true,
  // Optimización de imágenes: formatos modernos WebP/AVIF mejoran LCP.
  // Next.js convierte automáticamente <Image> a estos formatos si el browser los soporta.
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,   // cache de imágenes optimizadas por 24h en CDN
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Prefetch de páginas en viewport → navegación instantánea (mejora FCP/LCP en clics).
  // Ya está activado por defecto en Next.js pero declararlo explícitamente documenta la intención.
  async headers() {
    return [
      // Assets estáticos de Next.js: JS chunks, CSS, fonts.
      // El hash en el nombre del archivo garantiza cache-busting al cambiar el contenido.
      // immutable = el browser nunca los revalida durante el período → LCP más rápido en visitas repetidas.
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Assets propios en /public (favicon, og-image, etc.)
      {
        source: '/favicon.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.sentry.io https://*.ingest.sentry.io https://cloudflareinsights.com; frame-ancestors 'none'"
          }
        ]
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'none'; script-src 'none'; style-src 'none'"
          }
        ]
      }
    ];
  }
};

// Only wrap with Sentry build integration if auth token is available.
// The Sentry runtime SDK (DSN in sentry.*.config.ts) works regardless.
async function buildConfig() {
  if (process.env.SENTRY_AUTH_TOKEN) {
    const { withSentryConfig } = await import("@sentry/nextjs");
    return withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: false,
    });
  }
  return nextConfig;
}

export default buildConfig();
