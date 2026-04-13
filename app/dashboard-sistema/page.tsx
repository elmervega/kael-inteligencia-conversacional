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

interface DailyEntry {
  day: string
  calls: number
  cost: number
}

interface CostsData {
  month: string
  costUsd: number
  limitUsd: number
  percentUsed: number
  totalCalls: number
  promptTokens: number
  completionTokens: number
  daily: DailyEntry[]
  allTime: { costUsd: number; totalCalls: number }
}

type Tab = 'overview' | 'clients' | 'logs' | 'costs'
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
  const [costs, setCosts] = useState<CostsData | null>(null)

  // UI state
  const [logsError, setLogsError] = useState(false)
  const [securityError, setSecurityError] = useState(false)
  const [filter, setFilter] = useState<FilterLevel>('all')
  const [logsUpdate, setLogsUpdate] = useState<Date | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  // Delete / block / plan state
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [blockingId, setBlockingId] = useState<string | null>(null)
  const [changingPlanId, setChangingPlanId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null)

  const [servicesError, setServicesError] = useState(false)
  const [servicesUpdate, setServicesUpdate] = useState<Date | null>(null)

  /* ── Fetchers ── */
  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch('/api/system/status')
      if (res.ok) { setServices(await res.json()); setServicesError(false); setServicesUpdate(new Date()) }
      else setServicesError(true)
    } catch { setServicesError(true) }
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

  const fetchCosts = useCallback(async () => {
    try {
      const res = await fetch('/api/sistema/costs')
      if (res.ok) setCosts(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchServices(); fetchLogs(); fetchSecurity(); fetchUsers(); fetchCosts()
    const t1 = setInterval(fetchServices, 60000)   // servicios: cada 60s
    const t2 = setInterval(fetchLogs, 30000)        // logs: cada 30s
    const t3 = setInterval(fetchSecurity, 60000)    // seguridad: cada 60s
    const t4 = setInterval(fetchUsers, 60000)       // usuarios: cada 60s
    const t5 = setInterval(fetchCosts, 300000)      // costos: cada 5min
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); clearInterval(t4); clearInterval(t5) }
  }, [fetchServices, fetchLogs, fetchSecurity, fetchUsers, fetchCosts])

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

  const handleChangePlan = async (userId: string, plan: string) => {
    setChangingPlanId(userId)
    try {
      const res = await fetch('/api/sistema/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plan }),
      })
      if (res.ok) await fetchUsers()
    } finally {
      setChangingPlanId(null)
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
        <button className={tabClass('costs')} onClick={() => setTab('costs')}>
          💸 Costos IA
          {costs && costs.percentUsed >= 0.8 && (
            <span className="ml-1.5 text-[0.65rem] bg-yellow-900/60 text-yellow-300 px-1.5 py-0.5 rounded-full">
              {Math.round(costs.percentUsed * 100)}%
            </span>
          )}
        </button>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-5">

        {/* ─── TAB: OVERVIEW ─── */}
        {tab === 'overview' && (
          <>
            {/* Services */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold text-white">🖥️ Estado de Servicios</h2>
                    <span className="text-[0.6rem] bg-zinc-800/80 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">Monitoreo en tiempo real · DB · Caché · Servidor</span>
                  </div>
                  <p className="text-[0.68rem] text-zinc-600 mt-0.5">
                    Monitorea en tiempo real si la base de datos, caché y el servidor están operativos.
                    {servicesUpdate && <span> · Actualizado {servicesUpdate.toLocaleTimeString('es')} · refresca cada 60s</span>}
                  </p>
                </div>
                {servicesError && (
                  <span className="text-[0.65rem] bg-yellow-900/30 border border-yellow-800 text-yellow-400 px-2 py-1 rounded-lg shrink-0">
                    ⚠️ Sin datos
                  </span>
                )}
              </div>

              {servicesError ? (
                <div className="mt-3 bg-yellow-950/20 border border-yellow-900/40 rounded-xl p-4">
                  <p className="text-xs font-semibold text-yellow-400 mb-2">🚨 Plan de contingencia — servicio no responde</p>
                  <ol className="text-xs text-zinc-500 space-y-1 list-decimal list-inside">
                    <li>SSH al servidor: <code className="text-zinc-400 bg-zinc-800 px-1 rounded">ssh root@165.22.232.160</code></li>
                    <li>Revisar estado: <code className="text-zinc-400 bg-zinc-800 px-1 rounded">systemctl status kael-web</code></li>
                    <li>Ver logs: <code className="text-zinc-400 bg-zinc-800 px-1 rounded">journalctl -u kael-web -n 50</code></li>
                    <li>Reiniciar: <code className="text-zinc-400 bg-zinc-800 px-1 rounded">systemctl restart kael-web</code></li>
                  </ol>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-2">🗄️ PostgreSQL</p>
                    <p className="text-[0.65rem] text-zinc-600 mb-2">Base de datos principal. Almacena usuarios, sesiones y conversaciones.</p>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                      services?.services.database?.status?.includes('✅')
                        ? 'bg-green-900/30 text-green-400 border-green-800'
                        : 'bg-red-900/30 text-red-400 border-red-800'
                    }`}>
                      {services?.services.database?.status ?? '—'}
                    </span>
                    <p className="text-xs text-zinc-500 mt-2">{services?.services.database?.description ?? 'Verificando...'}</p>
                    {services?.services.database?.status?.includes('❌') && (
                      <p className="text-[0.65rem] text-red-400 mt-2">⚡ Contingencia: <code className="bg-zinc-800 px-1 rounded">systemctl restart postgresql</code></p>
                    )}
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-2">⚡ Redis</p>
                    <p className="text-[0.65rem] text-zinc-600 mb-2">Caché de sesiones y rate limiting. Si cae, el sistema usa fallback automático.</p>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                      services?.services.redis?.status?.includes('✅')
                        ? 'bg-green-900/30 text-green-400 border-green-800'
                        : 'bg-yellow-900/30 text-yellow-400 border-yellow-800'
                    }`}>
                      {services?.services.redis?.status ?? '—'}
                    </span>
                    <p className="text-xs text-zinc-500 mt-2">{services?.services.redis?.description ?? 'Verificando...'}</p>
                    {services?.services.redis?.status?.includes('⚠️') && (
                      <p className="text-[0.65rem] text-yellow-400 mt-2">⚡ Fallback activo — el sistema sigue funcionando sin caché</p>
                    )}
                  </div>
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                    <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-2">⏱️ Uptime del Servidor</p>
                    <p className="text-[0.65rem] text-zinc-600 mb-2">Tiempo que el servicio lleva corriendo sin reinicios no planificados.</p>
                    <p className="text-xs text-zinc-300 font-mono mt-2 break-all">{services?.uptime ?? 'Verificando...'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick user stats */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
              <div className="mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold text-white">👥 Resumen de Usuarios</h2>
                  <span className="text-[0.6rem] bg-zinc-800/80 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">Cuentas registradas · gestionar desde tab Clientes</span>
                </div>
                <p className="text-[0.68rem] text-zinc-600 mt-0.5">Total de cuentas registradas en Kael. Ve al tab <strong className="text-zinc-400">Clientes</strong> para gestionar, bloquear o eliminar usuarios.</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-white">{users?.total ?? '—'}</p>
                  <p className="text-[0.68rem] text-zinc-500 mt-1">Total registrados</p>
                  <p className="text-[0.6rem] text-zinc-700 mt-0.5">Cuentas creadas</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">{users?.verified ?? '—'}</p>
                  <p className="text-[0.68rem] text-zinc-500 mt-1">Email verificado</p>
                  <p className="text-[0.6rem] text-zinc-700 mt-0.5">Confirmaron su email</p>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
                  <p className={`text-3xl font-bold ${(users?.pendingVerification ?? 0) > 0 ? 'text-yellow-400' : 'text-zinc-400'}`}>
                    {users?.pendingVerification ?? '—'}
                  </p>
                  <p className="text-[0.68rem] text-zinc-500 mt-1">Pendientes</p>
                  <p className="text-[0.6rem] text-zinc-700 mt-0.5">Sin confirmar email</p>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
              <div className="mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold text-white">🔒 Eventos de Seguridad (24h)</h2>
                  <span className="text-[0.6rem] bg-zinc-800/80 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">Logins fallidos · IPs bloqueadas · Rate limit · Errores de sesión</span>
                </div>
                <p className="text-[0.68rem] text-zinc-600 mt-0.5">
                  Actividad sospechosa detectada en las últimas 24 horas. Incluye intentos de login fallidos,
                  IPs bloqueadas automáticamente por fail2ban, y abusos de rate limiting.
                </p>
              </div>
              {securityError ? (
                <div className="bg-yellow-950/20 border border-yellow-900/40 rounded-xl p-4">
                  <p className="text-xs font-semibold text-yellow-400 mb-2">⚠️ No se pudieron obtener datos de seguridad</p>
                  <p className="text-[0.68rem] text-zinc-500">Plan de contingencia: revisar manualmente con <code className="bg-zinc-800 px-1 rounded text-zinc-400">sudo fail2ban-client status sshd</code> y <code className="bg-zinc-800 px-1 rounded text-zinc-400">journalctl -u kael-web | grep Security</code></p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Logins fallidos', desc: 'Intentos con password incorrecta', value: security?.failedLogins.count24h, color: 'text-red-400' },
                      { label: 'IPs bloqueadas', desc: 'Bloqueadas por fail2ban (SSH)', value: security?.bannedIPs.length, color: 'text-orange-400' },
                      { label: 'Rate limit hits', desc: 'Solicitudes excesivas bloqueadas', value: security?.rateLimitHits.count24h, color: 'text-yellow-400' },
                      { label: 'Errores de sesión', desc: 'Tokens inválidos o expirados', value: security?.dashboardAuthErrors.count24h, color: 'text-zinc-400' },
                    ].map(({ label, desc, value, color }) => (
                      <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                        <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
                        <p className="text-[0.65rem] text-zinc-500 mt-1">{label}</p>
                        <p className="text-[0.58rem] text-zinc-700 mt-0.5 leading-snug">{desc}</p>
                      </div>
                    ))}
                  </div>
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
                </>
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
                        <select
                          value={u.plan ?? 'free'}
                          onChange={e => handleChangePlan(u.id, e.target.value)}
                          disabled={changingPlanId === u.id}
                          title="Cambiar plan"
                          className={`text-[0.6rem] capitalize rounded border px-1.5 py-0.5 cursor-pointer disabled:opacity-50 transition-colors ${
                            u.plan === 'pro'
                              ? 'bg-indigo-900/40 border-indigo-700/50 text-indigo-300'
                              : u.plan === 'empresarial'
                              ? 'bg-amber-900/40 border-amber-700/50 text-amber-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                          }`}
                        >
                          <option value="free">free</option>
                          <option value="pro">pro ⭐</option>
                          <option value="empresarial">empresarial 🏢</option>
                        </select>
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold text-white">📋 Logs de Aplicación</h2>
                  <span className="text-[0.6rem] bg-zinc-800/80 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">🔴 Error · 🟡 Warning · ⚪ Info</span>
                </div>
                <p className="text-[0.68rem] text-zinc-600 mt-0.5 max-w-xl">
                  Registro en tiempo real del servidor. Muestra errores críticos (rojo), advertencias de seguridad
                  como rate limits o accesos no autorizados (amarillo), y actividad normal (blanco).
                  {logsUpdate && <span> · Actualizado {logsUpdate.toLocaleTimeString('es')} · refresca cada 30s</span>}
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
              <div className="mt-4 bg-red-950/20 border border-red-900/40 rounded-xl p-4">
                <p className="text-xs font-semibold text-red-400 mb-2">🚨 No se pueden leer los logs del servidor</p>
                <p className="text-[0.68rem] text-zinc-500 mb-3">El proceso no tiene permisos para leer journald, o el servicio no está corriendo.</p>
                <p className="text-[0.68rem] text-zinc-400 font-semibold mb-1">Plan de contingencia:</p>
                <ol className="text-[0.68rem] text-zinc-500 space-y-1 list-decimal list-inside">
                  <li>SSH: <code className="bg-zinc-800 text-zinc-400 px-1 rounded">ssh root@165.22.232.160</code></li>
                  <li>Logs en vivo: <code className="bg-zinc-800 text-zinc-400 px-1 rounded">journalctl -u kael-web -f</code></li>
                  <li>Últimos 100: <code className="bg-zinc-800 text-zinc-400 px-1 rounded">journalctl -u kael-web -n 100 --no-pager</code></li>
                  <li>Solo errores: <code className="bg-zinc-800 text-zinc-400 px-1 rounded">journalctl -u kael-web -p err -n 50</code></li>
                </ol>
              </div>
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
        {/* ─── TAB: COSTS ─── */}
        {tab === 'costs' && (
          <>
            {/* Monthly summary */}
            <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold text-white">💸 Costos OpenAI — {costs?.month ?? '...'}</h2>
                    <span className="text-[0.6rem] bg-zinc-800/80 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
                      gpt-4o-mini · $0.15/1M input · $0.60/1M output
                    </span>
                  </div>
                  <p className="text-[0.68rem] text-zinc-600 mt-0.5">Consumo acumulado del mes actual vs. tope de alerta configurado.</p>
                </div>
                <button
                  onClick={fetchCosts}
                  className="text-xs text-zinc-500 border border-zinc-800 px-3 py-1.5 rounded-lg hover:bg-zinc-900 hover:text-zinc-300 transition shrink-0"
                >
                  Refrescar
                </button>
              </div>

              {!costs ? (
                <p className="text-xs text-zinc-600 py-4">Cargando datos de costos...</p>
              ) : (
                <>
                  {/* KPI cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                    <div className={`rounded-xl p-4 border ${costs.percentUsed >= 0.95 ? 'bg-red-950/30 border-red-900/50' : costs.percentUsed >= 0.8 ? 'bg-yellow-950/30 border-yellow-900/50' : 'bg-zinc-900/50 border-zinc-800'}`}>
                      <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-1">Gasto del mes</p>
                      <p className={`text-2xl font-bold ${costs.percentUsed >= 0.95 ? 'text-red-400' : costs.percentUsed >= 0.8 ? 'text-yellow-400' : 'text-white'}`}>
                        ${costs.costUsd.toFixed(4)}
                      </p>
                      <p className="text-[0.65rem] text-zinc-600 mt-1">de ${costs.limitUsd} límite</p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                      <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-1">Llamadas API</p>
                      <p className="text-2xl font-bold text-white">{costs.totalCalls.toLocaleString()}</p>
                      <p className="text-[0.65rem] text-zinc-600 mt-1">este mes</p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                      <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-1">Tokens entrada</p>
                      <p className="text-2xl font-bold text-white">{costs.promptTokens.toLocaleString()}</p>
                      <p className="text-[0.65rem] text-zinc-600 mt-1">prompt tokens</p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                      <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-1">Tokens salida</p>
                      <p className="text-2xl font-bold text-white">{costs.completionTokens.toLocaleString()}</p>
                      <p className="text-[0.65rem] text-zinc-600 mt-1">completion tokens</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-5">
                    <div className="flex justify-between text-[0.68rem] mb-1.5">
                      <span className="text-zinc-500">Uso del tope mensual</span>
                      <span className={costs.percentUsed >= 0.95 ? 'text-red-400 font-semibold' : costs.percentUsed >= 0.8 ? 'text-yellow-400 font-semibold' : 'text-zinc-400'}>
                        {(costs.percentUsed * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          costs.percentUsed >= 0.95
                            ? 'bg-red-500'
                            : costs.percentUsed >= 0.8
                            ? 'bg-yellow-500'
                            : 'bg-indigo-500'
                        }`}
                        style={{ width: `${Math.min(costs.percentUsed * 100, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[0.62rem] text-zinc-700 mt-1">
                      <span>$0</span>
                      <span className="text-yellow-700">Alerta 80% (${(costs.limitUsd * 0.8).toFixed(0)})</span>
                      <span>${costs.limitUsd}</span>
                    </div>
                  </div>

                  {/* Alert badges */}
                  {costs.percentUsed >= 0.95 && (
                    <div className="bg-red-950/40 border border-red-800 rounded-xl p-3 mb-4">
                      <p className="text-xs text-red-300 font-semibold">🚨 Crítico: superaste el 95% del tope. Revisa el dashboard de OpenAI o reduce el uso de la API inmediatamente.</p>
                    </div>
                  )}
                  {costs.percentUsed >= 0.8 && costs.percentUsed < 0.95 && (
                    <div className="bg-yellow-950/40 border border-yellow-800 rounded-xl p-3 mb-4">
                      <p className="text-xs text-yellow-300">⚠️ Advertencia: estás al {Math.round(costs.percentUsed * 100)}% del tope mensual de ${costs.limitUsd}.</p>
                    </div>
                  )}

                  {/* Daily breakdown */}
                  {costs.daily.length > 0 && (
                    <div>
                      <p className="text-[0.68rem] text-zinc-500 uppercase tracking-wider mb-3">Detalle por día</p>
                      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                        {[...costs.daily].reverse().map(d => (
                          <div key={d.day} className="flex items-center gap-3 py-2 border-b border-zinc-800/60 last:border-0">
                            <span className="text-[0.68rem] text-zinc-500 font-mono w-24 shrink-0">{d.day}</span>
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${Math.min((d.cost / (costs.limitUsd / 30)) * 100, 100)}%` }}
                              />
                            </div>
                            <span className="text-[0.68rem] text-zinc-400 font-mono w-20 text-right shrink-0">${d.cost.toFixed(5)}</span>
                            <span className="text-[0.65rem] text-zinc-600 w-16 text-right shrink-0">{d.calls} calls</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {costs.daily.length === 0 && (
                    <p className="text-xs text-zinc-600 text-center py-4">No hay llamadas registradas este mes.</p>
                  )}

                  {/* All-time totals */}
                  <div className="mt-5 pt-4 border-t border-zinc-800 flex gap-6">
                    <div>
                      <p className="text-[0.65rem] text-zinc-600 uppercase tracking-wider">Total histórico</p>
                      <p className="text-sm text-zinc-300 font-semibold mt-0.5">${costs.allTime.costUsd.toFixed(4)}</p>
                    </div>
                    <div>
                      <p className="text-[0.65rem] text-zinc-600 uppercase tracking-wider">Llamadas totales</p>
                      <p className="text-sm text-zinc-300 font-semibold mt-0.5">{costs.allTime.totalCalls.toLocaleString()}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
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
