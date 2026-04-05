'use client'

import { useState } from 'react'

const prompts = [
  { label: 'Email profesional', icon: '📧', text: 'Escribe un email profesional para solicitar una reunión con un cliente nuevo.' },
  { label: 'Presentación personal', icon: '👤', text: 'Descríbete en 3 oraciones como si te presentaras en una entrevista de trabajo.' },
  { label: 'Resumen ejecutivo', icon: '📋', text: 'Resume en 5 puntos los principales beneficios de tu producto o servicio.' },
  { label: 'Mensaje persuasivo', icon: '💡', text: 'Escribe un mensaje corto para convencer a alguien de probar un nuevo hábito.' },
  { label: 'Historia corta', icon: '✍️', text: 'Escribe el primer párrafo de una historia sobre alguien que supera un gran reto.' },
  { label: 'Feedback constructivo', icon: '🎯', text: 'Da feedback constructivo sobre el trabajo de un compañero que no cumplió el plazo.' },
]

type Exercise = { prompt: string; text: string; score: number | null; feedback: string | null }

export default function WritingSkillsPage() {
  const [activePrompt, setActivePrompt] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null)
  const [history, setHistory] = useState<Exercise[]>([])

  const selectPrompt = (prompt: string) => {
    setActivePrompt(prompt)
    setText('')
    setResult(null)
  }

  const analyze = async () => {
    if (!text.trim() || text.trim().split(' ').length < 5) return
    setLoading(true)
    setResult(null)

    // Simulate AI analysis (replace with real API call when ready)
    await new Promise(r => setTimeout(r, 1200))
    const words = text.trim().split(/\s+/).length
    const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length
    const avgWordsPerSentence = words / Math.max(sentences, 1)

    let score = 60
    if (words >= 30) score += 10
    if (words >= 60) score += 5
    if (sentences >= 2) score += 10
    if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 20) score += 10
    if (text.includes(',') || text.includes(';')) score += 5
    score = Math.min(score, 98)

    const feedbacks = [
      score >= 85 ? '¡Excelente escritura! Tu texto es claro, bien estructurado y persuasivo.' :
      score >= 70 ? 'Buen trabajo. El texto es comprensible. Intenta variar más la estructura de tus oraciones.' :
      'Hay espacio para mejorar. Elabora más las ideas y usa conectores para dar fluidez.',
      words < 20 ? ' Intenta escribir más — el texto se ve muy corto para el ejercicio.' : '',
      avgWordsPerSentence > 25 ? ' Tus oraciones son muy largas, considera dividirlas.' :
      avgWordsPerSentence < 5 ? ' Desarrolla más cada idea antes de pasar a la siguiente.' : '',
    ].join('')

    const exercise: Exercise = { prompt: activePrompt!, text, score, feedback: feedbacks }
    setHistory(prev => [exercise, ...prev].slice(0, 5))
    setResult({ score, feedback: feedbacks })
    setLoading(false)
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white tracking-tight mb-1">✍️ Writing Skills</h1>
        <p className="text-zinc-500 text-sm">Practica tu escritura con ejercicios guiados</p>
      </div>

      {/* Selección de ejercicio */}
      {!activePrompt ? (
        <div>
          <p className="text-zinc-400 text-sm mb-4">Elige un ejercicio para practicar:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prompts.map(p => (
              <button
                key={p.label}
                onClick={() => selectPrompt(p.text)}
                className="flex items-start gap-3 p-4 rounded-xl border border-[#222] bg-[#111] hover:bg-[#161622] hover:border-indigo-500/30 transition-all text-left group"
              >
                <span className="text-2xl mt-0.5">{p.icon}</span>
                <div>
                  <p className="text-sm font-medium text-zinc-200 group-hover:text-white transition">{p.label}</p>
                  <p className="text-xs text-zinc-600 mt-0.5 line-clamp-2">{p.text}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Historial */}
          {history.length > 0 && (
            <div className="mt-8">
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-3">Ejercicios recientes</p>
              <div className="space-y-2">
                {history.map((ex, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#111] border border-[#1e1e1e]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      ex.score! >= 85 ? 'bg-emerald-500/20 text-emerald-400' :
                      ex.score! >= 70 ? 'bg-amber-500/20 text-amber-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {ex.score}
                    </div>
                    <p className="text-xs text-zinc-500 line-clamp-1">{ex.prompt}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Prompt activo */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 mb-5">
            <span className="text-indigo-400 mt-0.5 shrink-0">📝</span>
            <p className="text-sm text-zinc-300 leading-relaxed">{activePrompt}</p>
          </div>

          {/* Área de escritura */}
          <textarea
            value={text}
            onChange={e => { setText(e.target.value); setResult(null) }}
            placeholder="Escribe tu respuesta aquí..."
            rows={8}
            className="w-full bg-[#0e0e0e] border border-[#282828] rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-zinc-600">{wordCount} palabra{wordCount !== 1 ? 's' : ''}</span>
            <div className="flex gap-2">
              <button
                onClick={() => { setActivePrompt(null); setText(''); setResult(null) }}
                className="px-4 py-2 text-xs text-zinc-500 border border-[#282828] rounded-lg hover:text-zinc-300 hover:border-zinc-600 transition"
              >
                Cambiar ejercicio
              </button>
              <button
                onClick={analyze}
                disabled={loading || wordCount < 5}
                className="px-5 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg hover:from-indigo-500 hover:to-violet-500 transition disabled:opacity-40"
              >
                {loading ? 'Analizando...' : 'Analizar escritura'}
              </button>
            </div>
          </div>

          {/* Resultado */}
          {result && (
            <div className={`mt-5 p-5 rounded-xl border ${
              result.score >= 85 ? 'border-emerald-500/30 bg-emerald-500/5' :
              result.score >= 70 ? 'border-amber-500/30 bg-amber-500/5' :
              'border-red-500/30 bg-red-500/5'
            }`}>
              <div className="flex items-center gap-4 mb-3">
                <div className={`text-4xl font-bold ${
                  result.score >= 85 ? 'text-emerald-400' :
                  result.score >= 70 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {result.score}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    result.score >= 85 ? 'text-emerald-400' :
                    result.score >= 70 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {result.score >= 85 ? 'Excelente' : result.score >= 70 ? 'Bien' : 'En desarrollo'}
                  </p>
                  <p className="text-xs text-zinc-500">puntuación de escritura</p>
                </div>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">{result.feedback}</p>
              <button
                onClick={() => { setText(''); setResult(null) }}
                className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 transition underline"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
