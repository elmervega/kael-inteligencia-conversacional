'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Log {
  timestamp: string
  level: 'error' | 'warning' | 'info'
  message: string
}

interface SecurityData {
  failedLogins: { count24h: number; recent: Array<{ timestamp: string; type: string }> }
  bannedIPs: string[]
  rateLimitHits: { count24h: number; recent: Array<{ timestamp: string; message: string }> }
  dashboardAuthErrors: { count24h: number }
}

interface ServiceStatus {
  timestamp: string
  services: {
    database?: { status: string; description: string }
    redis?: { status: string; description: string; stats?: { connected_clients: string; total_commands: string } }
  }
  uptime?: string
}

interface UsersData {
  total: number
  verified: number
  pendingVerification: number
  recent: Array<{
    id: string
    name: string | null
    email: string | null
    phone: string | null
    emailVerified: string | null
    createdAt: string
    plan: string | null
  }>
}

type FilterLevel = 'all' | 'error' | 'warning' | 'info'

export default function DashboardSistema() {
  const router = useRouter()
  const [services, setServices] = useState<ServiceStatus | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [security, setSecurity] = useState<SecurityData | null>(null)
  const [users, setUsers] = useState<UsersData | null>(null)
  const [logsError, setLogsError] = useState(false)
  const [securityError, setSecurityError] = useState(false)
  const [filter, setFilter] = useState<FilterLevel>('all')
  const [logsUpdate, setLogsUpdate] = useState<Date | null>(null)
  const [securityUpdate, setSecurityUpdate] = useState<Date | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/system/status')
      if (res.ok) setServices(await res.json())
    } catch {}
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/sistema/app-logs')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLogs(data.logs ?? [])
      setLogsUpdate(new Date())
      setLogsError(false)
    } catch {
      setLogsError(true)
    }
  }, [])

  const fetchSecurity = useCallback(async () => {
    try {
      const res = await fetch('/api/sistema/security')
      if (!res.ok) throw new Error()
      setSecurity(await res.json())
      setSecurityUpdate(new Date())
      setSecurityError(false)
    } catch {
      setSecurityError(true)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/sistema/users')
      if (res.ok) setUsers(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchServices()
    fetchLogs()
    fetchSecurity()
    fetchUsers()
    const t1 = setInterval(fetchServices, 30000)
    const t2 = setInterval(fetchLogs, 15000)
    const t3 = setInterval(fetchSecurity, 30000)
    const t4 = setInterval(fetchUsers, 60000)
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); clearInterval(t4) }
  }, [fetchServices, fetchLogs, fetchSecurity, fetchUsers])

  const handleLogout = async () => {
    await fetch('/api/sistema/auth', { method: 'DELETE' })
    router.push('/sistema/login')
  }

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter)

  const levelRowClass = (level: string) => ({
    error: 'bg-red-950/30 border-red-900/40 hover:bg-red-950/50',
    warning: 'bg-yellow-950/30 border-yellow-900/40 hover:bg-yellow-950/50',
    info: 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900',
  }[level] ?? 'bg-zinc-900/60 border-zinc-800')

  const levelTextClass = (level: string) => ({
    error: 'text-red-300',
    warning: 'text-yellow-200',
    info: 'text-zinc-300',
  }[level] ?? 'text-zinc-300')

  const levelDot = (level: string) => ({
    error: '🔴',
    warning: '🟡',
    info: '⚪',
  }[level] ?? '⚪')

  const filterBtnClass = (f: FilterLevel) => {
    const active = filter === f
    const base = 'px-3 py-1 text-xs rounded-full border transition'
    const styles: Record<FilterLevel, string> = {
      all: active ? 'bg-zinc-700 border-zinc-500 text-white' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
      error: active ? 'bg-red-900/60 border-red-700 text-red-300' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
      warning: active ? 'bg-yellow-900/60 border-yellow-700 text-yellow-300' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
      info: active ? 'bg-zinc-700 border-zinc-500 text-zinc-200' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
    }
    return `${base} ${styles[f]}`
  }

  const countOf = (l: FilterLevel) => l === 'all' ? logs.length : logs.filter(x => x.level === l).length

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' })
    } catch { return iso }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header */}
      <div className="border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">🛡️ Panel de Sistema</h1>
          <p className="text-[0.7rem] text-zinc-600 mt-0.5">Kael Web — Administración independiente</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-xs text-zinc-400 border border-zinc-800 rounded-lg hover:bg-zinc-900 hover:text-white transition"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">

        {/* Services row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-2">🗄️ PostgreSQL</p>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              services?.services.database?.status?.includes('✅')
                ? 'bg-green-900/30 text-green-400 border-green-800'
                : 'bg-red-900/30 text-red-400 border-red-800'
            }`}>
              {services?.services.database?.status ?? '—'}
            </span>
            <p className="text-xs text-zinc-500 mt-2">{services?.services.database?.description ?? 'Cargando...'}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-2">⚡ Redis</p>
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
              services?.services.redis?.status?.includes('✅')
                ? 'bg-green-900/30 text-green-400 border-green-800'
                : 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
            }`}>
              {services?.services.redis?.status ?? '—'}
            </span>
            <p className="text-xs text-zinc-500 mt-2">{services?.services.redis?.description ?? 'Cargando...'}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-2">⏱️ Uptime</p>
            <p className="text-xs text-zinc-300 font-mono mt-3">{services?.uptime ?? 'Cargando...'}</p>
          </div>
        </div>

        {/* Users section */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">👥 Usuarios Registrados</h2>
            <span className="text-[0.68rem] text-zinc-600">Refresca cada 60s</span>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{users?.total ?? '—'}</p>
              <p className="text-[0.65rem] text-zinc-500 mt-1">Total</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-400">{users?.verified ?? '—'}</p>
              <p className="text-[0.65rem] text-zinc-500 mt-1">Verificados</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${(users?.pendingVerification ?? 0) > 0 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                {users?.pendingVerification ?? '—'}
              </p>
              <p className="text-[0.65rem] text-zinc-500 mt-1">Sin verificar</p>
            </div>
          </div>

          {users && users.recent.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-zinc-600 border-b border-zinc-800">
                    <th className="text-left pb-2 font-medium">Nombre</th>
                    <th className="text-left pb-2 font-medium">Email / Teléfono</th>
                    <th className="text-left pb-2 font-medium">Registro</th>
                    <th className="text-left pb-2 font-medium">Estado</th>
                    <th className="text-left pb-2 font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {users.recent.map(u => (
                    <tr key={u.id} className="hover:bg-zinc-900/40 transition">
                      <td className="py-2 pr-3 text-zinc-300 font-medium">{u.name ?? '—'}</td>
                      <td className="py-2 pr-3">
                        <div className="text-zinc-400">{u.email ?? '—'}</div>
                        {u.phone && <div className="text-zinc-600">{u.phone}</div>}
                      </td>
                      <td className="py-2 pr-3 text-zinc-500 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                      <td className="py-2 pr-3">
                        {u.emailVerified ? (
                          <span className="text-green-400 bg-green-900/20 border border-green-900/40 px-1.5 py-0.5 rounded text-[0.65rem]">✓ Verificado</span>
                        ) : (
                          <span className="text-yellow-400 bg-yellow-900/20 border border-yellow-900/40 px-1.5 py-0.5 rounded text-[0.65rem]">⏳ Pendiente</span>
                        )}
                      </td>
                      <td className="py-2 text-zinc-500 capitalize">{u.plan ?? 'free'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security section */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-white">🔒 Eventos de Seguridad (24h)</h2>
              {securityUpdate && (
                <p className="text-[0.68rem] text-zinc-600 mt-0.5">
                  Actualizado {securityUpdate.toLocaleTimeString('es')} · refresca cada 30s
                </p>
              )}
            </div>
          </div>

          {securityError ? (
            <p className="text-yellow-500 text-xs">No se pudo obtener datos de seguridad</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{security?.failedLogins.count24h ?? '—'}</p>
                <p className="text-[0.65rem] text-zinc-500 mt-1">Logins fallidos</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{security?.bannedIPs.length ?? '—'}</p>
                <p className="text-[0.65rem] text-zinc-500 mt-1">IPs bloqueadas</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{security?.rateLimitHits.count24h ?? '—'}</p>
                <p className="text-[0.65rem] text-zinc-500 mt-1">Rate limit hits</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-zinc-400">{security?.dashboardAuthErrors.count24h ?? '—'}</p>
                <p className="text-[0.65rem] text-zinc-500 mt-1">Errores de sesión</p>
              </div>
            </div>
          )}

          {security && security.bannedIPs.length > 0 && (
            <div className="mt-3">
              <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-2">IPs bloqueadas por fail2ban</p>
              <div className="flex flex-wrap gap-1.5">
                {security.bannedIPs.map(ip => (
                  <span key={ip} className="text-xs font-mono bg-red-900/20 border border-red-900/40 text-red-300 px-2 py-0.5 rounded">
                    {ip}
                  </span>
                ))}
              </div>
            </div>
          )}

          {security && security.failedLogins.recent.length > 0 && (
            <div className="mt-4">
              <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-2">Últimos intentos fallidos</p>
              <div className="space-y-1">
                {security.failedLogins.recent.slice(-5).reverse().map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs bg-red-950/20 border border-red-900/30 rounded px-3 py-1.5">
                    <span className="text-red-500">⚠</span>
                    <span className="text-zinc-500 font-mono shrink-0">{item.timestamp.slice(0, 19)}</span>
                    <span className="text-red-300">{item.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Logs section */}
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">📋 Logs de Aplicación</h2>
              <p className="text-[0.68rem] text-zinc-600 mt-0.5">
                {logsUpdate
                  ? `Actualizado ${logsUpdate.toLocaleTimeString('es')} · refresca cada 15s`
                  : 'Cargando...'}
              </p>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'error', 'warning', 'info'] as FilterLevel[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={filterBtnClass(f)}
                >
                  {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="ml-1 opacity-60">({countOf(f)})</span>
                </button>
              ))}
            </div>
          </div>

          {logsError ? (
            <p className="text-red-400 text-sm py-6 text-center">Error al cargar logs. Reintentando...</p>
          ) : (
            <div className="space-y-1 max-h-[480px] overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <p className="text-zinc-600 text-sm py-6 text-center">Sin logs con este filtro</p>
              ) : filteredLogs.map((log, idx) => (
                <div
                  key={idx}
                  onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                  className={`border rounded-lg px-3 py-2 cursor-pointer transition ${levelRowClass(log.level)}`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[0.65rem] mt-0.5 shrink-0">{levelDot(log.level)}</span>
                    <span className="text-[0.65rem] text-zinc-500 font-mono shrink-0 mt-0.5">
                      {log.timestamp.slice(0, 19)}
                    </span>
                    <span className={`text-xs leading-relaxed ${levelTextClass(log.level)} ${
                      expandedIdx === idx ? '' : 'line-clamp-1'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
