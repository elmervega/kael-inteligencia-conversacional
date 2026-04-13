import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { requireSistemaAuth } from '@/lib/sistema-auth'

const execPromise = promisify(exec)

export async function GET() {
  if (!(await requireSistemaAuth())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const result = {
    failedLogins: { count24h: 0, recent: [] as Array<{ timestamp: string; type: string }> },
    bannedIPs: [] as string[],
    rateLimitHits: { count24h: 0, recent: [] as Array<{ timestamp: string; message: string }> },
    dashboardAuthErrors: { count24h: 0 },
  }

  // Logins fallidos, rate limit hits y errores de auth del dashboard
  try {
    const { stdout } = await execPromise(
      'journalctl -u kael-web --since "24 hours ago" --no-pager --output=short-iso 2>&1'
    )
    const lines = stdout.split('\n').filter(l => l.trim())

    for (const line of lines) {
      const parts = line.split(' ')
      const timestamp = parts[0] ?? ''

      if (line.includes('CredentialsSignin') || line.includes('MissingCSRF')) {
        result.failedLogins.count24h++
        result.failedLogins.recent.push({
          timestamp,
          type: line.includes('MissingCSRF') ? 'MissingCSRF' : 'CredentialsSignin',
        })
      }

      if (line.includes('Rate limit exceeded') || line.includes('rate limit exceeded')) {
        result.rateLimitHits.count24h++
        const msgStart = line.indexOf('[Security]')
        result.rateLimitHits.recent.push({
          timestamp,
          message: msgStart >= 0 ? line.slice(msgStart) : line.slice(-80),
        })
      }

      if (line.includes('auth() returned null') || line.includes('session.user.id missing')) {
        result.dashboardAuthErrors.count24h++
      }
    }

    // Mantener solo los últimos 10 / 5
    result.failedLogins.recent = result.failedLogins.recent.slice(-10)
    result.rateLimitHits.recent = result.rateLimitHits.recent.slice(-5)
  } catch {
    // Los otros checks continúan aunque este falle
  }

  // IPs bloqueadas por fail2ban
  try {
    const { stdout } = await execPromise('fail2ban-client status sshd 2>&1')
    const match = stdout.match(/Banned IP list:\s*(.+)/s)
    if (match) {
      result.bannedIPs = match[1]
        .trim()
        .split(/\s+/)
        .filter(ip => ip.length > 0 && ip !== 'No')
    }
  } catch {
    result.bannedIPs = []
  }

  return NextResponse.json(result)
}
