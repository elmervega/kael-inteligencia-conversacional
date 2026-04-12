import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execPromise = promisify(exec)

function classifyLevel(message: string): 'error' | 'warning' | 'info' {
  const m = message.toLowerCase()
  if (
    m.includes('[auth][error]') ||
    m.includes('missingcsrf') ||
    m.includes('credentialssignin') ||
    m.includes('auth() returned null') ||
    m.includes('session.user.id missing') ||
    m.includes('bus error') ||
    m.includes('enoent') ||
    m.includes('unhandledrejection') ||
    m.includes('"error"') ||
    /\berror:/i.test(message)
  ) return 'error'

  if (
    m.includes('[security]') ||
    m.includes('rate limit exceeded') ||
    m.includes('unauthorized') ||
    m.includes('warn') ||
    m.includes('⚠️')
  ) return 'warning'

  return 'info'
}

function sanitize(message: string): string {
  return message
    .replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***')
    .replace(/Bearer [a-zA-Z0-9\-._~+/]+=*/g, 'Bearer ***')
    .replace(/password[:\s"']+\S+/gi, 'password:***')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '***EMAIL***')
}

export async function GET() {
  try {
    const { stdout } = await execPromise(
      'journalctl -u kael-web -n 100 --no-pager --output=short-iso 2>&1'
    )

    const logs = stdout
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(' ')
        const timestamp = parts[0] ?? new Date().toISOString()
        const rawMessage = parts.slice(4).join(' ')
        const message = sanitize(rawMessage)
        const level = classifyLevel(message)
        return { timestamp, level, message }
      })
      .reverse() // Más reciente primero

    return NextResponse.json({ logs })
  } catch {
    return NextResponse.json({ logs: [], error: 'No se pudieron obtener los logs' })
  }
}
