import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, rateLimitConfig } from '@/lib/rateLimit'

/**
 * POST /api/memory/store
 * Almacena contexto de conversación en la memoria de Kael
 *
 * Body:
 * {
 *   "user_id": "string",
 *   "message": "string",
 *   "response": "string",
 *   "metadata": { "platform": "telegram", "timestamp": "2026-04-03..." }
 * }
 */
export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = await req.json()

      const { user_id, message, response, metadata } = body

      if (!user_id || !message) {
        return NextResponse.json(
          { error: 'user_id and message are required' },
          { status: 400 }
        )
      }

      // Aquí irían las operaciones de BD para guardar en tabla 'conversation_memory'
      // Para ahora, simulamos el guardado:
      const memory_entry = {
        id: crypto.getRandomValues(new Uint8Array(16)).toString(),
        user_id,
        message,
        response,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      }

      console.log('[MEMORY] Storing conversation:', {
        user_id,
        message_preview: message.substring(0, 50) + '...',
      })

      return NextResponse.json({
        success: true,
        stored_id: memory_entry.id,
        message: 'Conversación guardada en memoria',
      })
    } catch (error) {
      console.error('[MEMORY] Error storing:', error)
      return NextResponse.json(
        { error: 'Failed to store memory' },
        { status: 500 }
      )
    }
  },
  rateLimitConfig.api
)
