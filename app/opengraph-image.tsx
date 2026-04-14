// app/opengraph-image.tsx
// Next.js genera automáticamente /opengraph-image y lo enlaza en <head>.
// Se sirve como PNG 1200×630, el formato estándar para Open Graph y Twitter Cards.
// Al borrar /og-image.png del metadata y usar este archivo, el compartir en
// WhatsApp, Twitter, LinkedIn, etc. mostrará esta imagen en lugar de nada.
import { ImageResponse } from 'next/og'

export const runtime = 'edge'          // generación en el edge → latencia mínima
export const alt = 'Kael — Inteligencia Conversacional'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #050505 0%, #0d0b2a 60%, #050505 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow de fondo */}
        <div
          style={{
            position: 'absolute',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
          }}
        />

        {/* Icono diamante */}
        <div style={{ display: 'flex', marginBottom: 32 }}>
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L5 9L12 16L19 9L12 2Z" stroke="#6366f1" strokeWidth="1.2" />
            <path d="M12 22L5 15L12 8L19 15L12 22Z" stroke="#818cf8" strokeWidth="1.2" />
            <path d="M5 9L19 9" stroke="#6366f1" strokeWidth="1.2" />
            <path d="M5 15L19 15" stroke="#818cf8" strokeWidth="1.2" />
            <path d="M12 8L12 16" stroke="#a5b4fc" strokeWidth="1.2" />
          </svg>
        </div>

        {/* Título */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-3px',
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          Kael
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            color: '#a1a1aa',
            textAlign: 'center',
            maxWidth: 680,
            lineHeight: 1.4,
            marginBottom: 32,
          }}
        >
          No es una IA. Es Kael.
        </div>

        {/* Separator */}
        <div
          style={{
            width: 48,
            height: 2,
            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            borderRadius: 2,
            marginBottom: 24,
          }}
        />

        {/* URL */}
        <div
          style={{
            fontSize: 18,
            color: '#6366f1',
            letterSpacing: '4px',
            textTransform: 'uppercase',
          }}
        >
          kael.quest
        </div>
      </div>
    ),
    { ...size }
  )
}
