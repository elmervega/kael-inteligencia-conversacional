'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/* ─── Types ──────────────────────────────────────────── */
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
    redis?: { status: string; description: string }
  }
  uptime?: string
}

interface UserRow {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  emailVerified: string | null
  createdAt: string
  plan: string | null
  blocked: boolean
}

interface UsersData {
  total: number
  verified: number
  pendingVerification: number
  recent: UserRow[]
}

type Tab = 'overview' | 'clients' | 'logs'
type FilterLevel = 'all' | 'error' | 'warning' | 'info'

/* ─── Main component ─────────────────────────────────── */
export default function DashboardSistema() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')

  // Data state
  const [services, setServices] = useState<ServiceStatus | null>(null)
  const [logs, setLogs] = useState<Log[]>([])
  const [security, setSecurity] = useState<SecurityData | null>(null)
  const [users, setUsers] = useState<UsersData | null>(null)

  // UI state
  const [logsError, setLogsError] = useState(false)
  const [securityError, setSecurityError] = useState(false)
  const [filter, setFilter] = useState<FilterLevel>('all')
  const [logsUpdate, setLogsUpdate] = useState<Date | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  // Delete / block state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [blockingId, setBlockingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null)

  /* ── Fetchers ── */
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
    fetchServices(); fetchLogs(); fetchSecurity(); fetchUsers()
    const t1 = setInterval(fetchServices, 30000)
    const t2 = setInterval(fetchLogs, 15000)
    const t3 = setInterval(fetchSecurity, 30000)
    const t4 = setInterval(fetchUsers, 60000)
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); clearInterval(t4) }
  }, [fetchServices, fetchLogs, fetchSecurity, fetchUsers])

  /* ── Delete user ── */
  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return
    setDeletingId(confirmDelete.id)
    try {
      const res = await fetch('/api/sistema/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: confirmDelete.id }),
      })
      if (res.ok) await fetchUsers()
    } finally {
      setDeletingId(null)
      setConfirmDelete(null)
    }
  }

  const handleToggleBlock = async (u: UserRow) => {
    setBlockingId(u.id)
    try {
      const res = await fetch('/api/sistema/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: u.id, blocked: !u.blocked }),
      })
      if (res.ok) await fetchUsers()
    } finally {
      setBlockingId(null)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/sistema/auth', { method: 'DELETE' })
    router.push('/sistema/login')
  }

  /* ── Helpers ── */
  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.level === filter)

  const levelRowClass = (l: string) => ({
    error: 'bg-red-950/30 border-red-900/40 hover:bg-red-950/50',
    warning: 'bg-yellow-950/30 border-yellow-900/40 hover:bg-yellow-950/50',
    info: 'bg-zinc-900/60 border-zinc-800 hover:bg-zinc-900',
  }[l] ?? 'bg-zinc-900/60 border-zinc-800')

  const levelTextClass = (l: string) => ({
    error: 'text-red-300', warning: 'text-yellow-200', info: 'text-zinc-300',
  }[l] ?? 'text-zinc-300')

  const levelDot = (l: string) => ({ error: '🔴', warning: '🟡', info: '⚪' }[l] ?? '⚪')

  const filterBtnClass = (f: FilterLevel) => {
    const active = filter === f
    const base = 'px-3 py-1 text-xs rounded-full border transition'
    const s: Record<FilterLevel, string> = {
      all: active ? 'bg-zinc-700 border-zinc-500 text-white' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
      error: active ? 'bg-red-900/60 border-red-700 text-red-300' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
      warning: active ? 'bg-yellow-900/60 border-yellow-700 text-yellow-300' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
      info: active ? 'bg-zinc-700 border-zinc-500 text-zinc-200' : 'border-zinc-800 text-zinc-500 hover:border-zinc-600',
    }
    return `${base} ${s[f]}`
  }

  const countOf = (l: FilterLevel) => l === 'all' ? logs.length : logs.filter(x => x.level === l).length

  const fmt = (iso: string) => {
    try { return new Date(iso).toLocaleString('es', { dateStyle: 'short', timeStyle: 'short' }) }
    catch { return iso }
  }

  const tabClass = (t: Tab) =>
    `px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
      tab === t
        ? 'border-white text-white'
        : 'border-transparent text-zinc-500 hover:text-zinc-300'
    }`

  /* ─── Render ─────────────────────────────────────────── */
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

      {/* Tabs */}
      <div className="border-b border-zinc-800/60 px-6 flex gap-1 overflow-x-auto">
        <button className={tabClass('overview')} onClick={() => setTab('overview')}>Resumen</button>
        <button className={tabClass('clients')} onClick={() => setTab('clients')}>
          Clientes
          {users && <span className="ml-1.5 text-[0.65rem] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full">{users.total}</span>}
        </button>
        <button className={tabClass('logs')} onClick={() => setTab('logs')}>
          Logs
          {logs.filter(l => l.level === 'error').length > 0 && (
            <span className="ml-1.5 text-[0.65rem] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded-full">
              {logs.filter(l => l.level === 'error').length}
            </span>
          )}
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">

        {/* ─── TAB: OVERVIEW ─── */}
        {tab === 'overview' && (
          <>
            {/* Services */}
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

            {/* Quick user stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-white">{users?.total ?? '—'}</p>
                <p className="text-[0.68rem] text-zinc-500 mt-1">Usuarios registrados</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-400">{users?.verified ?? '—'}</p>
                <p className="text-[0.68rem] text-zinc-500 mt-1">Email verificado</p>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${(users?.pendingVerification ?? 0) > 0 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                  {users?.pendingVerification ?? '—'}
                </p>
                <p className="text-[0.68rem] text-zinc-500 mt-1">Sin verificar</p>
              </div>
            </div>

            {/* Security */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">🔒 Eventos de Seguridad (24h)</h2>
              {securityError ? (
                <p className="text-yellow-500 text-xs">No se pudo obtener datos</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Logins fallidos', value: security?.failedLogins.count24h, color: 'text-red-400' },
                    { label: 'IPs bloqueadas', value: security?.bannedIPs.length, color: 'text-orange-400' },
                    { label: 'Rate limit hits', value: security?.rateLimitHits.count24h, color: 'text-yellow-400' },
                    { label: 'Errores de sesión', value: security?.dashboardAuthErrors.count24h, color: 'text-zinc-400' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
                      <p className="text-[0.65rem] text-zinc-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              )}
              {security && security.bannedIPs.length > 0 && (
                <div className="mt-4">
                  <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-2">IPs bloqueadas por fail2ban</p>
                  <div className="flex flex-wrap gap-1.5">
                    {security.bannedIPs.map(ip => (
                      <span key={ip} className="text-xs font-mono bg-red-900/20 border border-red-900/40 text-red-300 px-2 py-0.5 rounded">{ip}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ─── TAB: CLIENTS ─── */}
        {tab === 'clients' && (
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-white">👥 Clientes Registrados</h2>
                <p className="text-[0.68rem] text-zinc-600 mt-0.5">
                  {users ? `${users.total} total · ${users.verified} verificados · ${users.pendingVerification} pendientes` : 'Cargando...'}
                </p>
              </div>
              <button
                onClick={fetchUsers}
                className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-800 rounded-lg px-3 py-1.5 transition hover:bg-zinc-900"
              >
                Actualizar
              </button>
            </div>

            {!users || users.recent.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-8">Sin usuarios registrados</p>
            ) : (
              <div className="space-y-2">
                {users.recent.map(u => (
                  <div
                    key={u.id}
                    className={`flex items-center gap-3 border rounded-xl px-4 py-3 transition ${
                      u.blocked
                        ? 'bg-red-950/20 border-red-900/40'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                      u.blocked ? 'bg-red-900/60' : 'bg-gradient-to-br from-indigo-500 to-violet-600'
                    }`}>
                      {u.blocked ? '🚫' : (u.name?.[0] ?? u.email?.[0] ?? '?').toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${u.blocked ? 'text-zinc-500 line-through' : 'text-zinc-200'}`}>
                          {u.name ?? 'Sin nombre'}
                        </span>
                        {u.blocked && (
                          <span className="text-[0.6rem] bg-red-900/30 border border-red-900/50 text-red-400 px-1.5 py-0.5 rounded">⛔ Bloqueado</span>
                        )}
                        {!u.blocked && (u.emailVerified ? (
                          <span className="text-[0.6rem] bg-green-900/30 border border-green-900/50 text-green-400 px-1.5 py-0.5 rounded">✓ Verificado</span>
                        ) : (
                          <span className="text-[0.6rem] bg-yellow-900/30 border border-yellow-900/50 text-yellow-400 px-1.5 py-0.5 rounded">⏳ Sin verificar</span>
                        ))}
                        <span className="text-[0.6rem] text-zinc-600 capitalize bg-zinc-800 px-1.5 py-0.5 rounded">{u.plan ?? 'free'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-zinc-500">{u.email ?? '—'}</span>
                        {u.phone && <span className="text-xs text-zinc-600">{u.phone}</span>}
                        <span className="text-xs text-zinc-700">{fmt(u.createdAt)}</span>
                      </div>
                    </div>

                    {/* Action buttons — always visible */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleBlock(u)}
                        disabled={blockingId === u.id}
                        className={`p-2 rounded-lg transition text-xs disabled:opacity-40 ${
                          u.blocked
                            ? 'text-green-500 hover:bg-green-950/30 hover:text-green-400'
                            : 'text-orange-500 hover:bg-orange-950/30 hover:text-orange-400'
                        }`}
                        title={u.blocked ? 'Desbloquear usuario' : 'Bloquear usuario'}
                      >
                        {blockingId === u.id ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".3"/><path d="M21 12a9 9 0 00-9-9"/></svg>
                        ) : u.blocked ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        )}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u)}
                        className="p-2 text-red-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition"
                        title="Eliminar usuario"
                      >
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2 4h11M6 4V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5V4M5 4v8.5a.5.5 0 00.5.5h4a.5.5 0 00.5-.5V4"/>
                          <line x1="6.5" y1="7" x2="6.5" y2="11"/>
                          <line x1="8.5" y1="7" x2="8.5" y2="11"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: LOGS ─── */}
        {tab === 'logs' && (
          <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-sm font-semibold text-white">📋 Logs de Aplicación</h2>
                <p className="text-[0.68rem] text-zinc-600 mt-0.5">
                  {logsUpdate ? `Actualizado ${logsUpdate.toLocaleTimeString('es')} · refresca cada 15s` : 'Cargando...'}
                </p>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(['all', 'error', 'warning', 'info'] as FilterLevel[]).map(f => (
                  <button key={f} onClick={() => setFilter(f)} className={filterBtnClass(f)}>
                    {f === 'all' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                    <span className="ml-1 opacity-60">({countOf(f)})</span>
                  </button>
                ))}
              </div>
            </div>

            {logsError ? (
              <p className="text-red-400 text-sm py-6 text-center">Error al cargar logs. Reintentando...</p>
            ) : (
              <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
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
                      <span className="text-[0.65rem] text-zinc-500 font-mono shrink-0 mt-0.5">{log.timestamp.slice(0, 19)}</span>
                      <span className={`text-xs leading-relaxed ${levelTextClass(log.level)} ${expandedIdx === idx ? '' : 'line-clamp-1'}`}>
                        {log.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Modal confirmar eliminación ─── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Eliminar usuario</h3>
            <p className="text-sm text-zinc-400 mb-1">
              ¿Seguro que quieres eliminar permanentemente a:
            </p>
            <div className="bg-zinc-800/60 rounded-lg px-4 py-3 my-3">
              <p className="text-sm font-medium text-zinc-200">{confirmDelete.name ?? 'Sin nombre'}</p>
              <p className="text-xs text-zinc-500">{confirmDelete.email}</p>
              {confirmDelete.phone && <p className="text-xs text-zinc-600">{confirmDelete.phone}</p>}
            </div>
            <p className="text-xs text-red-400 mb-5">Esta acción no se puede deshacer. Se eliminarán también sus tokens de verificación.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 text-sm border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deletingId === confirmDelete.id}
                className="flex-1 py-2.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg transition disabled:opacity-50 font-medium"
              >
                {deletingId === confirmDelete.id ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
