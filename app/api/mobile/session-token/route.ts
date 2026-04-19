import { auth } from '@/lib/auth'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Endpoint exclusivo para la APK Android.
// Lee la cookie httpOnly de NextAuth server-side (donde SÍ es accesible)
// y retransmite el token JWT para que SessionHydrator lo guarde en
// Android SharedPreferences (sobrevive a SIGKILL, battery optimization, reboots).
//
// Seguridad:
//   - Requiere sesión activa (401 si no autenticado)
//   - El JWT está firmado con NEXTAUTH_SECRET → no puede ser forjado
//   - SharedPreferences está sandboxeado por app → inaccesible a otras apps

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const store = await cookies()

  // NextAuth v5 usa __Secure- prefix en HTTPS production, sin prefix en HTTP dev
  const token =
    store.get('__Secure-authjs.session-token')?.value ??
    store.get('authjs.session-token')?.value

  if (!token) {
    return NextResponse.json({ error: 'token_not_found' }, { status: 404 })
  }

  return NextResponse.json({ token })
}
