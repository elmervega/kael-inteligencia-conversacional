'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

interface SidebarProps {
  user: { name?: string | null; email?: string | null; plan?: string }
}

const navItems = [
  { href: '/dashboard', icon: '⚡', label: 'Inicio', exact: true },
  { href: '/dashboard/conversations', icon: '💬', label: 'Conversaciones' },
  { href: '/dashboard/reminders', icon: '🔔', label: 'Recordatorios' },
]

const accountItems = [
  { href: '/dashboard/settings', icon: '⚙️', label: 'Configurar Kael' },
  { href: '/dashboard/profile', icon: '👤', label: 'Mi Perfil' },
  { href: '/dashboard/plan', icon: '💎', label: 'Mi Plan' },
]

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  return (
    <aside className="w-56 min-h-screen bg-[#111] border-r border-[#1e1e1e] flex flex-col px-3 py-6 shrink-0">
      {/* Logo */}
      <div className="px-3 mb-8 text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
        Kael
      </div>

      {/* Nav principal */}
      <p className="px-3 mb-2 text-[0.65rem] uppercase tracking-widest text-zinc-600">Principal</p>
      <nav className="flex flex-col gap-0.5 mb-4">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
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

      {/* Cuenta */}
      <p className="px-3 mb-2 text-[0.65rem] uppercase tracking-widest text-zinc-600">Cuenta</p>
      <nav className="flex flex-col gap-0.5">
        {accountItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
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

      {/* User chip */}
      <div className="mt-auto pt-4 border-t border-[#1a1a1a]">
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
    </aside>
  )
}
