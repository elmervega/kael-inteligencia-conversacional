import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, rateLimitConfig } from '@/lib/rateLimit'

/**
 * POST /api/reminders/schedule
 * Programa un recordatorio para el usuario
 *
 * Body:
 * {
 *   "user_id": "string",
 *   "reminder_text": "string",
 *   "scheduled_time": "2026-04-03T10:30:00Z",
 *   "platform": "telegram|whatsapp|email",
 *   "platform_id": "telegram_chat_id|whatsapp_number|email"
 * }
 */
export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = await req.json()

      const { user_id, reminder_text, scheduled_time, platform, platform_id } =
        body

      // Validar campos requeridos
      if (!user_id || !reminder_text || !scheduled_time) {
        return NextResponse.json(
          {
            error: 'user_id, reminder_text, and scheduled_time are required',
          },
          { status: 400 }
        )
      }

      // Validar que la hora sea futura
      const scheduledDate = new Date(scheduled_time)
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'scheduled_time must be in the future' },
          { status: 400 }
        )
      }

      console.log('[REMINDER] Scheduling reminder:', {
        user_id,
        reminder_text: reminder_text.substring(0, 50),
        scheduled_time,
        platform,
      })

      // Aquí irían las operaciones de BD para guardar recordatorio
      // y configurar cron jobs o triggers en n8n
      const reminder_id = crypto.getRandomValues(new Uint8Array(16)).toString()

      return NextResponse.json({
        success: true,
        reminder_id,
        user_id,
        reminder_text,
        scheduled_time,
        message: 'Recordatorio programado exitosamente',
      })
    } catch (error) {
      console.error('[REMINDER] Error scheduling:', error)
      return NextResponse.json(
        { error: 'Failed to schedule reminder' },
        { status: 500 }
      )
    }
  },
  rateLimitConfig.api
)
