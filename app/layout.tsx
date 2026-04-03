import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Providers from './providers'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Kael — No es una IA. Es Kael.',
  description: 'Una presencia que te escucha, recuerda y cuestiona. Diseñada para acompañarte, no solo responder.',
  keywords: ['kael', 'inteligencia artificial', 'asistente', 'telegram', 'recordatorios', 'IA conversacional'],
  authors: [{ name: 'Elmer Aron Vega' }],
  creator: 'Elmer Aron Vega',
  metadataBase: new URL('https://kael.quest'),
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://kael.quest',
    siteName: 'Kael',
    title: 'Kael — No es una IA. Es Kael.',
    description: 'Una presencia que te escucha, recuerda y cuestiona. Diseñada para acompañarte, no solo responder.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kael — Inteligencia Conversacional',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kael — No es una IA. Es Kael.',
    description: 'Una presencia que te escucha, recuerda y cuestiona.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  robots: {
    index: true,
    follow: true,
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