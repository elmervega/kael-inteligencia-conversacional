import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ALERT_THRESHOLD_USD = parseFloat(process.env.OPENAI_COST_ALERT_USD ?? '200')

export async function GET() {
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Monthly aggregate
    const agg = await prisma.apiUsage.aggregate({
      where: { createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { costUsd: true, promptTokens: true, completionTokens: true },
      _count: { id: true },
    })

    const totalCost       = Number(agg._sum.costUsd ?? 0)
    const totalPrompt     = agg._sum.promptTokens ?? 0
    const totalCompletion = agg._sum.completionTokens ?? 0
    const totalCalls      = agg._count.id
    const percentUsed     = totalCost / ALERT_THRESHOLD_USD

    // Daily breakdown for the current month (last 30 days max)
    const daily = await prisma.$queryRaw<
      Array<{ day: string; calls: bigint; cost: string }>
    >`
      SELECT
        DATE(created_at)::TEXT AS day,
        COUNT(*)::BIGINT AS calls,
        SUM(cost_usd)::TEXT AS cost
      FROM api_usage
      WHERE created_at >= ${monthStart} AND created_at <= ${monthEnd}
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `

    // All-time totals
    const allTime = await prisma.apiUsage.aggregate({
      _sum: { costUsd: true },
      _count: { id: true },
    })

    return NextResponse.json({
      month: now.toLocaleDateString('es', { month: 'long', year: 'numeric' }),
      monthStart: monthStart.toISOString(),
      costUsd: totalCost,
      limitUsd: ALERT_THRESHOLD_USD,
      percentUsed: percentUsed,
      totalCalls,
      promptTokens: totalPrompt,
      completionTokens: totalCompletion,
      daily: daily.map(d => ({
        day: d.day,
        calls: Number(d.calls),
        cost: Number(d.cost),
      })),
      allTime: {
        costUsd: Number(allTime._sum.costUsd ?? 0),
        totalCalls: allTime._count.id,
      },
    })
  } catch (err) {
    console.error('[/api/sistema/costs] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch cost data' }, { status: 500 })
  }
}
