import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

// Requiere CRON_SECRET en header Authorization: Bearer <secret>
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

// Umbrales de alerta (% del tope mensual)
const ALERT_THRESHOLD_USD = parseFloat(process.env.OPENAI_COST_ALERT_USD ?? '200')
const WARN_AT_PERCENT     = 0.80   // alerta al 80%
const CRITICAL_AT_PERCENT = 0.95   // alerta crítica al 95%

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const alertEmail = process.env.COST_ALERT_EMAIL ?? 'aroonvegaf@gmail.com'

  // Rango del mes actual
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  try {
    // Agregación del mes en curso
    const agg = await prisma.apiUsage.aggregate({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { costUsd: true, promptTokens: true, completionTokens: true },
      _count: { id: true }
    })

    const totalCost     = Number(agg._sum.costUsd ?? 0)
    const totalPrompt   = agg._sum.promptTokens ?? 0
    const totalCompletion = agg._sum.completionTokens ?? 0
    const totalCalls    = agg._count.id

    const pctUsed = totalCost / ALERT_THRESHOLD_USD
    const monthLabel = now.toLocaleDateString('es', { month: 'long', year: 'numeric' })

    console.log(`[Cron CostCheck] ${monthLabel}: $${totalCost.toFixed(4)} / $${ALERT_THRESHOLD_USD} (${(pctUsed * 100).toFixed(1)}%) — ${totalCalls} llamadas`)

    // Solo enviar email si supera el umbral de advertencia
    if (pctUsed < WARN_AT_PERCENT) {
      return NextResponse.json({
        ok: true,
        month: monthLabel,
        costUsd: totalCost,
        limitUsd: ALERT_THRESHOLD_USD,
        percentUsed: (pctUsed * 100).toFixed(1),
        alert: false
      })
    }

    const isCritical = pctUsed >= CRITICAL_AT_PERCENT
    const subject = isCritical
      ? `🚨 CRÍTICO: OpenAI cerca del límite — $${totalCost.toFixed(2)} de $${ALERT_THRESHOLD_USD}`
      : `⚠️ Alerta: OpenAI al ${(pctUsed * 100).toFixed(0)}% del tope mensual`

    await resend.emails.send({
      from: 'Kael Monitor <noreply@kael.quest>',
      to: alertEmail,
      subject,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #0a0a0a; color: #f0f0f0; border-radius: 12px;">
          <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 6px;">
            ${isCritical ? '🚨 Alerta Crítica de Costos' : '⚠️ Alerta de Costos OpenAI'}
          </h1>
          <p style="color: #888; margin-bottom: 24px;">Kael · Reporte mensual de uso</p>

          <div style="background: ${isCritical ? '#1a0a0a' : '#0a1020'}; border: 1px solid ${isCritical ? '#ff4444' : '#f59e0b'}; border-radius: 10px; padding: 20px; margin-bottom: 20px;">
            <p style="color: #999; font-size: 12px; margin: 0 0 4px;">Gasto en ${monthLabel}</p>
            <p style="font-size: 32px; font-weight: 800; color: ${isCritical ? '#ff6666' : '#fbbf24'}; margin: 0 0 4px;">
              $${totalCost.toFixed(4)}
            </p>
            <p style="color: #666; font-size: 13px; margin: 0;">de $${ALERT_THRESHOLD_USD} tope mensual · ${(pctUsed * 100).toFixed(1)}% usado</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr style="border-bottom: 1px solid #222;">
              <td style="padding: 10px 0; color: #888; font-size: 13px;">Llamadas a OpenAI</td>
              <td style="padding: 10px 0; color: #fff; font-size: 13px; text-align: right;">${totalCalls.toLocaleString()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #222;">
              <td style="padding: 10px 0; color: #888; font-size: 13px;">Tokens de entrada</td>
              <td style="padding: 10px 0; color: #fff; font-size: 13px; text-align: right;">${totalPrompt.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #888; font-size: 13px;">Tokens de salida</td>
              <td style="padding: 10px 0; color: #fff; font-size: 13px; text-align: right;">${totalCompletion.toLocaleString()}</td>
            </tr>
          </table>

          ${isCritical ? `
          <div style="background: #1a0000; border: 1px solid #ff4444; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
            <p style="color: #ff8888; font-size: 13px; margin: 0; font-weight: 600;">
              Acción recomendada: revisar el límite en el panel de OpenAI o reducir el uso de la API inmediatamente.
            </p>
          </div>` : ''}

          <p style="color: #444; font-size: 12px;">Este email fue generado automáticamente por Kael Monitor · ${now.toISOString()}</p>
        </div>
      `
    })

    console.log(`[Cron CostCheck] Email de alerta enviado a ${alertEmail}`)

    return NextResponse.json({
      ok: true,
      month: monthLabel,
      costUsd: totalCost,
      limitUsd: ALERT_THRESHOLD_USD,
      percentUsed: (pctUsed * 100).toFixed(1),
      alert: true,
      critical: isCritical,
      emailSent: true
    })
  } catch (err) {
    console.error('[Cron CostCheck] Error:', err)
    return NextResponse.json({ error: 'Cost check failed' }, { status: 500 })
  }
}
