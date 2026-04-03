'use client'

interface AnimatedBackgroundProps {
  primary?: string
  secondary?: string
}

export default function AnimatedBackground({
  primary = 'bg-blue-500/10',
  secondary = 'bg-violet-500/10',
}: AnimatedBackgroundProps) {
  return (
    <div className="fixed inset-0 -z-10">
      <div className="absolute inset-0 bg-black" />
      <div className={`absolute top-0 left-1/4 w-96 h-96 ${primary} rounded-full blur-3xl animate-pulse`} />
      <div className={`absolute bottom-1/4 right-1/4 w-80 h-80 ${secondary} rounded-full blur-3xl animate-pulse delay-1000`} />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-500" />
      {/* Grid de fondo */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:64px_64px]" />
    </div>
  )
}
