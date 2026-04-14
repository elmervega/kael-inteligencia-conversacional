// app/robots.ts
// Genera /robots.txt en tiempo de build.
// Bloquear /dashboard/ y /api/ evita que Google indexe páginas privadas
// y desperdicie crawl budget en rutas que de todos modos requieren auth.
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',       // área privada de usuarios
          '/dashboard-sistema/', // panel de admin
          '/api/',              // endpoints de API, no indexar
          '/reset-password',    // tokens de reset en URL, no indexar
        ],
      },
    ],
    sitemap: 'https://kael.quest/sitemap.xml',
    host: 'https://kael.quest',
  }
}
