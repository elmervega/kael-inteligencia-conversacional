import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, rateLimitConfig } from '@/lib/rateLimit'

/**
 * POST /api/reminders/list
 * Lista recordatorios activos de un usuario
 *
 * Body:
 * {
 *   "user_id": "string"
 * }
 */
export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = await req.json()
      const { user_id } = body

      if (!user_id) {
        return NextResponse.json(
          { error: 'user_id is required' },
          { status: 400 }
        )
      }

      console.log('[REMINDER] Listing reminders for user:', user_id)

      // Aquí irían queries a BD para obtener recordatorios del usuario
      // Para ahora, simulamos respuesta:
      const mock_reminders = [
        {
          id: '1',
          reminder_text: 'Tomar agua',
          scheduled_time: new Date(Date.now() + 3600000).toISOString(),
          platform: 'telegram',
          status: 'active',
        },
        {
          id: '2',
          reminder_text: 'Llamar al médico',
          scheduled_time: new Date(Date.now() + 86400000).toISOString(),
          platform: 'telegram',
          status: 'active',
        },
      ]

      return NextResponse.json({
        success: true,
        reminders: mock_reminders,
        total: mock_reminders.length,
        message: `${mock_reminders.length} recordatorios activos`,
      })
    } catch (error) {
      console.error('[REMINDER] Error listing:', error)
      return NextResponse.json(
        { error: 'Failed to list reminders' },
        { status: 500 }
      )
    }
  },
  rateLimitConfig.api
)
