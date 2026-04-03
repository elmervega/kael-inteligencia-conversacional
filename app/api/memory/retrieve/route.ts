import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, rateLimitConfig } from '@/lib/rateLimit'

/**
 * POST /api/memory/retrieve
 * Recupera contexto de conversación de la memoria de Kael
 *
 * Body:
 * {
 *   "user_id": "string",
 *   "limit": 5 (últimas N conversaciones)
 * }
 *
 * Response:
 * {
 *   "context": "string con resumen de conversaciones previas",
 *   "conversations": [ ... ]
 * }
 */
export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = await req.json()

      const { user_id, limit = 5 } = body

      if (!user_id) {
        return NextResponse.json(
          { error: 'user_id is required' },
          { status: 400 }
        )
      }

      console.log('[MEMORY] Retrieving context for user:', user_id)

      // Aquí irían queries a BD para obtener conversaciones previas del usuario
      // Para ahora, simulamos respuesta:
      const mock_conversations = [
        {
          id: '1',
          message: 'Hola Kael',
          response: 'Hola, ¿cómo estás?',
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: '2',
          message: '¿Cuál es mi nombre?',
          response: 'Tu nombre es Elmer',
          created_at: new Date(Date.now() - 1800000).toISOString(),
        },
      ]

      // Construir contexto para Claude
      const context = mock_conversations
        .slice(0, limit)
        .map((conv) => `Usuario: ${conv.message}\nKael: ${conv.response}`)
        .join('\n---\n')

      return NextResponse.json({
        success: true,
        context,
        conversations: mock_conversations,
        message: `Recuperados ${mock_conversations.length} conversaciones previas`,
      })
    } catch (error) {
      console.error('[MEMORY] Error retrieving:', error)
      return NextResponse.json(
        { error: 'Failed to retrieve memory' },
        { status: 500 }
      )
    }
  },
  rateLimitConfig.api
)
