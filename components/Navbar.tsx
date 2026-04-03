'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const navLinks = [
  { label: 'Características', href: '#features' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Demo', href: '#demo' },
  { label: 'Precios', href: '#pricing' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Bloquea el scroll del body cuando el menú está abierto
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const handleNav = (href: string) => {
    setMenuOpen(false)
    if (href.startsWith('#')) {
      setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } else {
      router.push(href)
    }
  }

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-8 py-5 transition-all duration-300 ${
          scrolled || menuOpen
            ? 'border-b border-zinc-800/50 backdrop-blur-md bg-black/90'
            : 'bg-transparent'
        }`}
      >
        {/* Logo */}
        <div
          className="text-xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent cursor-pointer"
          onClick={() => handleNav('/')}
        >
          Kael
        </div>

        {/* Links desktop */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-zinc-400 hover:text-white transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Botones desktop */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => router.push('/login')}
            className="text-sm text-zinc-400 hover:text-white transition-colors duration-200 px-4 py-2"
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => router.push('/register')}
            className="text-sm bg-white text-black px-4 py-2 rounded-full hover:bg-zinc-200 transition font-medium"
          >
            Comenzar gratis
          </button>
        </div>

        {/* Botón hamburguesa mobile */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 focus:outline-none"
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          <motion.span
            animate={menuOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.25 }}
            className="block w-5 h-px bg-white origin-center"
          />
          <motion.span
            animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.2 }}
            className="block w-5 h-px bg-white"
          />
          <motion.span
            animate={menuOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
            transition={{ duration: 0.25 }}
            className="block w-5 h-px bg-white origin-center"
          />
        </button>
      </motion.nav>

      {/* Menú mobile desplegable */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed top-[73px] left-0 right-0 bottom-0 z-40 bg-black/95 backdrop-blur-md md:hidden"
          >
            <div className="flex flex-col px-6 py-6 gap-1">
              {navLinks.map((link, i) => (
                <motion.button
                  key={link.href}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => handleNav(link.href)}
                  className="text-left text-lg text-zinc-300 hover:text-white py-4 border-b border-zinc-800/60 transition-colors duration-200"
                >
                  {link.label}
                </motion.button>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-col gap-3 mt-6"
              >
                <button
                  onClick={() => handleNav('/login')}
                  className="w-full py-3.5 text-sm text-zinc-400 border border-zinc-800 rounded-full hover:border-zinc-600 hover:text-white transition-all duration-200"
                >
                  Iniciar sesión
                </button>
                <button
                  onClick={() => handleNav('/register')}
                  className="w-full py-3.5 text-sm bg-white text-black rounded-full hover:bg-zinc-100 transition font-medium"
                >
                  Comenzar gratis
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
