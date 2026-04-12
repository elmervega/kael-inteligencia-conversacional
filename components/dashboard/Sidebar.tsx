'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'

interface SidebarProps {
  user: { name?: string | null; email?: string | null; plan?: string }
}

const navItems = [
  { href: '/dashboard', icon: '⚡', label: 'Inicio', exact: true },
  { href: '/dashboard/chat', icon: '🤖', label: 'Chat con Kael' },
  { href: '/dashboard/conversations', icon: '💬', label: 'Conversaciones' },
  { href: '/dashboard/reminders', icon: '🔔', label: 'Recordatorios' },
  { href: '/dashboard/writing-skills', icon: '✍️', label: 'Writing Skills' },
]

const accountItems = [
  { href: '/dashboard/settings', icon: '⚙️', label: 'Configurar Kael' },
  { href: '/dashboard/profile', icon: '👤', label: 'Mi Perfil' },
  { href: '/dashboard/plan', icon: '💎', label: 'Mi Plan' },
]

function NavLinks({
  user,
  onNavClick,
}: {
  user: SidebarProps['user']
  onNavClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <>
      <p className="px-3 mb-2 text-[0.65rem] uppercase tracking-widest text-zinc-600">Principal</p>
      <nav className="flex flex-col gap-0.5 mb-4">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive(item.href, item.exact)
                ? 'bg-[#1c1c2e] text-white font-medium'
                : 'text-zinc-500 hover:bg-[#1a1a1a] hover:text-zinc-300'
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <p className="px-3 mb-2 text-[0.65rem] uppercase tracking-widest text-zinc-600">Cuenta</p>
      <nav className="flex flex-col gap-0.5">
        {accountItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavClick}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive(item.href)
                ? 'bg-[#1c1c2e] text-white font-medium'
                : 'text-zinc-500 hover:bg-[#1a1a1a] hover:text-zinc-300'
            }`}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto">
        {/* CTA Upgrade para usuarios Free */}
        {user.plan !== 'pro' && (
          <a
            href="/dashboard/plan"
            className="flex items-center gap-2.5 px-3 py-2.5 mb-3 rounded-xl bg-gradient-to-r from-indigo-900/40 to-violet-900/40 border border-indigo-500/20 hover:border-indigo-500/40 transition-all group"
          >
            <span className="text-base w-5 text-center">💎</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-300 group-hover:text-indigo-200 transition-colors truncate">Actualizar a Pro</p>
              <p className="text-[0.6rem] text-zinc-600 truncate">B/. 9.99 / mes · Yappy</p>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-indigo-400 shrink-0">
              <path d="M7 17L17 7M17 7H7M17 7v10"/>
            </svg>
          </a>
        )}

        <div className="pt-4 border-t border-[#1a1a1a]">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[#161616] border border-[#222]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? 'K'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">{user.name ?? 'Usuario'}</p>
            <p className="text-[0.68rem] text-zinc-600 capitalize">{user.plan ?? 'free'}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full mt-1 px-3 py-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors text-left"
        >
          Cerrar sesión
        </button>
        </div>
      </div>
    </>
  )
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Cerrar drawer al cambiar de ruta
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="hidden md:flex md:flex-col w-56 min-h-screen bg-[#111] border-r border-[#1e1e1e] px-3 py-6 shrink-0">
        <div className="px-3 mb-8 text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Kael
        </div>
        <NavLinks user={user} />
      </aside>

      {/* ── Mobile top bar (fixed) ───────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-[#111]/95 backdrop-blur-md border-b border-[#1e1e1e] flex items-center justify-between px-4">
        <span className="text-lg font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Kael
        </span>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -mr-1 text-zinc-400 hover:text-white transition-colors"
          aria-label="Abrir menú"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
            <rect x="2" y="4.5" width="18" height="1.8" rx="0.9" />
            <rect x="2" y="10.1" width="18" height="1.8" rx="0.9" />
            <rect x="2" y="15.7" width="18" height="1.8" rx="0.9" />
          </svg>
        </button>
      </div>

      {/* ── Mobile overlay ───────────────────────────────── */}
      <div
        className={`md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── Mobile drawer ────────────────────────────────── */}
      <aside
        className={`md:hidden fixed left-0 top-0 bottom-0 z-50 w-72 bg-[#111] border-r border-[#1e1e1e] flex flex-col px-3 py-6 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header del drawer */}
        <div className="flex items-center justify-between mb-6 px-2">
          <span className="text-lg font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Kael
          </span>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
            aria-label="Cerrar menú"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="16" y2="16" />
              <line x1="16" y1="2" x2="2" y2="16" />
            </svg>
          </button>
        </div>

        <NavLinks user={user} onNavClick={() => setMobileOpen(false)} />
      </aside>
    </>
  )
}
