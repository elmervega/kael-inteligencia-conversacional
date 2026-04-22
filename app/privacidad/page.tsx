import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidad',
  description: 'Política de Privacidad de Kael — Información sobre el tratamiento de tus datos personales.',
}

const sections = [
  {
    title: '1. Información que recopilamos',
    body: 'Recopilamos datos de cuenta (nombre y correo electrónico a través de NextAuth), los mensajes que envías al asistente de IA para procesamiento de respuestas, y ajustes de personalización como nombre preferido, idioma y tono de comunicación.',
  },
  {
    title: '2. Uso de la información',
    body: 'La información recopilada se utiliza únicamente para proveer el servicio de asistente de IA, gestionar el acceso seguro a tu cuenta y personalizar tu experiencia dentro de la aplicación. No utilizamos tus datos con fines distintos al funcionamiento del servicio.',
  },
  {
    title: '3. Terceros',
    body: 'Los mensajes son procesados técnicamente a través de APIs de modelos de lenguaje para generar respuestas. Estos datos no se venden, alquilan ni comparten con terceros con fines comerciales externos.',
  },
  {
    title: '4. Seguridad',
    body: 'Protegemos tu información mediante encriptación en tránsito (HTTPS), tokens de sesión firmados digitalmente y almacenamiento seguro en el dispositivo mediante Capacitor Preferences (Android SharedPreferences). El acceso a los datos está restringido por autenticación.',
  },
  {
    title: '5. Tus derechos',
    body: 'Puedes solicitar la eliminación de tu cuenta y todos los datos asociados en cualquier momento. La opción está disponible dentro de la aplicación en Perfil → Zona de Peligro, o contactando directamente al soporte.',
  },
  {
    title: '6. Contacto',
    body: 'Para cualquier consulta relacionada con tu privacidad o el tratamiento de tus datos, puedes escribirnos a:',
    email: 'aroonvegaf@gmail.com',
  },
]

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-zinc-200 px-4 py-12">
      <div className="max-w-3xl mx-auto">

        {/* Volver al inicio */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-10 group"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Volver al inicio
        </Link>

        {/* Encabezado */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">Política de Privacidad de Kael</h1>
          <p className="text-sm text-zinc-500">Última actualización: abril de 2026</p>
          <p className="mt-4 text-zinc-400 leading-relaxed">
            En Kael nos comprometemos a proteger tu privacidad. Esta política describe qué información recopilamos,
            cómo la usamos y cuáles son tus derechos como usuario.
          </p>
        </div>

        {/* Secciones */}
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.title} className="border-t border-zinc-800 pt-6">
              <h2 className="text-base font-semibold text-white mb-2">{section.title}</h2>
              <p className="text-zinc-400 leading-relaxed text-sm">{section.body}</p>
              {section.email && (
                <a
                  href={`mailto:${section.email}`}
                  className="inline-block mt-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {section.email}
                </a>
              )}
            </section>
          ))}
        </div>

        {/* Pie */}
        <div className="mt-14 border-t border-zinc-800 pt-6 text-center">
          <p className="text-xs text-zinc-600">© {new Date().getFullYear()} Kael Inteligencia Conversacional. Todos los derechos reservados.</p>
        </div>

      </div>
    </main>
  )
}
