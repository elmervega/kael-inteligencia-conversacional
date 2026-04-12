import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cacheGet, cacheSet, getCacheKey } from "@/lib/redis";

// Rate limiting por userId (en memoria)
const userRequestCount = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 50;
const RATE_WINDOW = 3600000; // 1 hora

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const data = userRequestCount.get(userId);

  if (!data || now > data.resetTime) {
    userRequestCount.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  if (data.count >= RATE_LIMIT) return { allowed: false, remaining: 0 };

  data.count++;
  return { allowed: true, remaining: RATE_LIMIT - data.count };
}

export async function POST(req: Request) {
  try {
    // 1. Verificar sesión NextAuth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = session.user.id;
    const userName = session.user.name?.split(" ")[0] ?? "Usuario";

    // 2. Rate limiting
    const { allowed, remaining } = checkRateLimit(userId);
    if (!allowed) {
      return NextResponse.json(
        { error: "Límite de mensajes alcanzado. Intenta en una hora." },
        { status: 429 }
      );
    }

    // 3. Validar body
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

    // 4. Cache (solo para mensajes sin historial previo, para ahorrar costos)
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

    // 5. Verificar OPENAI_API_KEY
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY not configured");
      return NextResponse.json({ error: "Servicio no disponible" }, { status: 503 });
    }

    // 6. Construir historial de mensajes para OpenAI
    const recentHistory = history?.slice(-10) ?? [];
    const messages = [
      {
        role: "system" as const,
        content: `Eres Kael, un asistente virtual inteligente, empático y muy útil. Estás hablando con ${userName}. Respondes de forma clara, concisa y natural. Recuerdas el contexto de la conversación.`,
      },
      ...recentHistory,
      { role: "user" as const, content: trimmedMessage },
    ];

    // 7. Llamar a OpenAI con timeout
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
      if (
        !data.choices ||
        !data.choices[0]?.message?.content
      ) {
        console.error("Unexpected OpenAI response structure", data);
        return NextResponse.json(
          { error: "Respuesta inesperada del servicio" },
          { status: 502 }
        );
      }

      kaelResponse = data.choices[0].message.content;
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

    // 8. Guardar en cache (solo si no había historial previo)
    if (!history || history.length === 0) {
      await cacheSet(
        cacheKey,
        JSON.stringify({ response: kaelResponse }),
        3600
      );
    }

    console.log(`[Web Chat] User: ${userId} (${userName}) | Remaining: ${remaining}`);

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
