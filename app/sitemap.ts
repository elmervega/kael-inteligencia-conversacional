// app/sitemap.ts
// Google indexa /sitemap.xml automáticamente si está en robots.txt.
// En Next.js 15 App Router este archivo genera el XML en tiempo de build/request.
// Incluir solo rutas públicas — el dashboard está detrás de auth, no indexar.
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://kael.quest'
  const now = new Date()

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,           // página principal → máxima prioridad
    },
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${base}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,           // registro = conversión → prioridad alta
    },
    {
      url: `${base}/forgot-password`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
