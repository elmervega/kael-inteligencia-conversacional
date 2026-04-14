import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Providers from './providers'

// display:'swap' garantiza que el texto se muestre con fuente del sistema
// mientras carga Geist → evita CLS (Cumulative Layout Shift) y FCP lento.
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

// viewport debe exportarse SEPARADO de metadata en Next.js 15.
// Mezclarlos causa una advertencia en Lighthouse Best Practices.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#050505',
}

export const metadata: Metadata = {
  // title.template aplica a todas las sub-rutas:
  //   /dashboard → "Inicio | Kael"
  //   /login     → "Iniciar sesión | Kael"
  // Mejora CTR en resultados de búsqueda y evita títulos duplicados.
  title: {
    default: 'Kael — No es una IA. Es Kael.',
    template: '%s | Kael',
  },
  description: 'Una presencia que te escucha, recuerda y cuestiona. Diseñada para acompañarte, no solo responder.',
  keywords: ['kael', 'inteligencia artificial', 'asistente IA', 'chat inteligente', 'recordatorios', 'IA conversacional', 'SaaS IA'],
  authors: [{ name: 'Elmer Aron Vega' }],
  creator: 'Elmer Aron Vega',
  // metadataBase resuelve rutas relativas en OG/Twitter a URLs absolutas.
  metadataBase: new URL('https://kael.quest'),
  // canonical evita penalización por contenido duplicado (http vs https, www vs no-www).
  alternates: {
    canonical: 'https://kael.quest',
    languages: { 'es': 'https://kael.quest' },
  },
  openGraph: {
    type: 'website',
    locale: 'es_LA',
    url: 'https://kael.quest',
    siteName: 'Kael',
    title: 'Kael — No es una IA. Es Kael.',
    description: 'Una presencia que te escucha, recuerda y cuestiona. Diseñada para acompañarte, no solo responder.',
    // La imagen la genera app/opengraph-image.tsx automáticamente.
    // Next.js la sirve en /opengraph-image y la enlaza aquí.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kael — No es una IA. Es Kael.',
    description: 'Una presencia que te escucha, recuerda y cuestiona.',
    // Twitter Card también usa opengraph-image.tsx automáticamente.
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}