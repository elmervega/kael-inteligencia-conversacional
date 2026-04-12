import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cacheGet, cacheSet, getCacheKey } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { checkRateLimitRedis } from "@/lib/rateLimitRedis";

// Límites por plan
const PLAN_LIMITS: Record<string, { limit: number; window: number }> = {
  free: { limit: 25, window: 3_600_000 },       // 25 msg / 1 hora
  pro:  { limit: 500, window: 2_592_000_000 },   // 500 msg / 30 días
};

export async function POST(req: Request) {
  try {
    // 1. Verificar sesión NextAuth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;
    const userName = session.user.name?.split(" ")[0] ?? "Usuario";

    // 2. Obtener plan del usuario desde la BD
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    const plan = dbUser?.plan ?? "free";
    const planConfig = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;

    // 3. Rate limiting dinámico por plan (Redis-backed)
    const { allowed, remaining } = await checkRateLimitRedis(
      `chat:${plan}:${userId}`,
      planConfig.limit,
      planConfig.window
    );
    if (!allowed) {
      return NextResponse.json(
        {
          error:
            plan === "free"
              ? `Has alcanzado el límite de tu plan Free (${planConfig.limit} mensajes/hora). Mejora al Plan Pro para más mensajes.`
              : `Has alcanzado el límite de tu plan Pro (${planConfig.limit} mensajes/mes). Intenta más tarde.`,
        },
        { status: 429 }
      );
    }

    // 4. Validar body
    const body = await req.json();
    const { message, history } = body as {
      message: string;
      history?: Array<{ role: "user" | "assistant"; content: string }>;
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Mensaje requerido" },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim();

    // 5. Cache (solo para mensajes sin historial previo)
    const cacheKey = getCacheKey(userId, trimmedMessage);
    if (!history || history.length === 0) {
      const cached = await cacheGet(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return NextResponse.json({
          success: true,
          response: parsed.response,
          cached: true,
          remaining,
        });
      }
    }

    // 6. Verificar OPENAI_API_KEY
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY not configured");
      return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
    }

    // 7. Construir historial de mensajes para OpenAI
    const recentHistory = history?.slice(-10) ?? [];
    const messages = [
      {
        role: "system" as const,
        content: `Eres Kael, un asistente virtual inteligente, empático y muy útil. Estás hablando con ${userName}. Respondes de forma clara, concisa y natural. Recuerdas el contexto de la conversación.`,
      },
      ...recentHistory,
      { role: "user" as const, content: trimmedMessage },
    ];

    // 8. Llamar a OpenAI con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let kaelResponse: string;
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1024,
          messages,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`OpenAI error ${res.status}:`, err);
        if (res.status === 429) {
          return NextResponse.json(
            { error: "Servicio saturado. Intenta en unos segundos." },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { error: "Error al procesar tu mensaje" },
          { status: 502 }
        );
      }

      const data = await res.json();
      if (!data.choices || !data.choices[0]?.message?.content) {
        console.error("Unexpected OpenAI response structure", data);
        return NextResponse.json(
          { error: "Respuesta inesperada del servicio" },
          { status: 502 }
        );
      }

      kaelResponse = data.choices[0].message.content;

      // 9. Registrar uso de API para tracking de costos (fire & forget)
      // gpt-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
      const promptTokens     = data.usage?.prompt_tokens     ?? 0
      const completionTokens = data.usage?.completion_tokens ?? 0
      const costUsd = (promptTokens * 0.15 + completionTokens * 0.60) / 1_000_000

      prisma.apiUsage.create({
        data: { userId, model: 'gpt-4o-mini', promptTokens, completionTokens, costUsd }
      }).catch(err => console.error('[ApiUsage] Failed to record:', err))

    } catch (err) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        return NextResponse.json(
          { error: "La respuesta tardó demasiado. Intenta de nuevo." },
          { status: 504 }
        );
      }
      throw err;
    }

    // 10. Guardar en cache (solo si no había historial previo)
    if (!history || history.length === 0) {
      await cacheSet(
        cacheKey,
        JSON.stringify({ response: kaelResponse }),
        3600
      );
    }

    console.log(`[Web Chat] User: ${userId} (${userName}) | Plan: ${plan} | Remaining: ${remaining}`);

    return NextResponse.json({
      success: true,
      response: kaelResponse,
      remaining,
      cached: false,
    });
  } catch (error) {
    console.error("Unexpected chat error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
