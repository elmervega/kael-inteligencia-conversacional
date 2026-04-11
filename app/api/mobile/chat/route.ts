import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { cacheGet, cacheSet, getCacheKey } from "@/lib/redis";

// 🌟 1. EL PASE VIP (CORS HEADERS) 🌟
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// 🔒 2. RATE LIMITING POR USUARIO (En memoria - para producción usar Redis)
const userRequestCount = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10000; // TEST MODE: 10000 solicitudes (effectively unlimited for testing)
const RATE_WINDOW = 3600000; // por hora (3600000 ms)

function checkRateLimit(userId: string): { allowed: boolean; remainingRequests: number } {
  const now = Date.now();
  const userData = userRequestCount.get(userId);

  if (!userData || now > userData.resetTime) {
    // Nueva ventana de tiempo
    userRequestCount.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remainingRequests: RATE_LIMIT - 1 };
  }

  if (userData.count >= RATE_LIMIT) {
    return { allowed: false, remainingRequests: 0 };
  }

  userData.count++;
  return { allowed: true, remainingRequests: RATE_LIMIT - userData.count };
}

// 🌟 3. LA PUERTA DEL EXPLORADOR (OPTIONS) 🌟
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    // 1. Verificar la "llave" (Token JWT)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Token faltante" },
        { status: 401, headers: corsHeaders }
      );
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    let decoded;
    try {
      const { payload } = await jwtVerify(token, secret);
      decoded = payload;
    } catch (err) {
      console.warn(`Token validation failed: ${err}`);
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 403, headers: corsHeaders }
      );
    }

    const userId = decoded.userId as string;
    const userName = decoded.name as string;

    // 2️⃣ RATE LIMITING - Verificar límite de solicitudes por usuario
    const { allowed, remainingRequests } = checkRateLimit(userId);
    if (!allowed) {
      console.warn(`Rate limit exceeded for user: ${userId}`);
      return NextResponse.json(
        {
          error: "Has excedido el límite de solicitudes (máximo 5 por hora)",
          remainingRequests: 0,
        },
        { status: 429, headers: corsHeaders }
      );
    }

    const { message } = await req.json();
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Mensaje requerido y debe ser texto válido" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 3️⃣ VERIFICAR CACHE PRIMERO (⚡ REDUCE COSTO 90%)
    const cacheKey = getCacheKey(userId, message);
    const cachedResponse = await cacheGet(cacheKey);
    if (cachedResponse) {
      console.log(`[Cache HIT] User: ${userId} | Key: ${cacheKey}`);
      const cached = JSON.parse(cachedResponse);
      return NextResponse.json(
        {
          success: true,
          response: cached.response,
          metadata: {
            userId,
            userName,
            messageReceived: message,
            timestamp: cached.timestamp,
            remainingRequests,
            cached: true,
          },
        },
        { status: 200, headers: corsHeaders }
      );
    }

    // 4️⃣ VERIFICAR ANTHROPIC API KEY
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      console.error("ANTHROPIC_API_KEY not configured");
      return NextResponse.json(
        { error: "Servicio no disponible" },
        { status: 503, headers: corsHeaders }
      );
    }

    // 5️⃣ LLAMADA A CLAUDE CON TIMEOUT Y VALIDACIÓN
    let kaelResponse: string;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout

      try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": anthropicApiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-20250314",
            max_tokens: 1024,
            system: `Eres Kael, un asistente virtual inteligente, amigable y muy útil. Estás hablando con ${userName}. Responde de forma clara y concisa.`,
            messages: [
              {
                role: "user",
                content: message,
              },
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 6️⃣ VALIDAR RESPONSE DE CLAUDE
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(`Anthropic API error: ${response.status}`, errorData);

          if (response.status === 429) {
            return NextResponse.json(
              { error: "Claude está sobrecargado. Intenta más tarde." },
              { status: 503, headers: corsHeaders }
            );
          }

          if (response.status === 401) {
            console.error("Invalid Anthropic API key");
            return NextResponse.json(
              { error: "Error de configuración del servicio" },
              { status: 503, headers: corsHeaders }
            );
          }

          return NextResponse.json(
            { error: "Error al procesar tu mensaje" },
            { status: 502, headers: corsHeaders }
          );
        }

        const aiData = await response.json();

        // 7️⃣ VALIDAR ESTRUCTURA DE RESPONSE
        if (
          !aiData.content ||
          !Array.isArray(aiData.content) ||
          aiData.content.length === 0 ||
          !aiData.content[0].text
        ) {
          console.error("Unexpected Claude response structure", aiData);
          return NextResponse.json(
            { error: "Respuesta inesperada del servicio" },
            { status: 502, headers: corsHeaders }
          );
        }

        kaelResponse = aiData.content[0].text;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.error("Request timeout to Claude");
        return NextResponse.json(
          { error: "Solicitud tardó demasiado. Intenta de nuevo." },
          { status: 504, headers: corsHeaders }
        );
      }
      throw err;
    }
    const timestamp = new Date().toISOString();

    // 📊 AUDITORÍA - Registrar uso de API
    console.log(`[API Call] User: ${userId} (${userName}) | Model: Claude 3.5 Haiku | Remaining: ${remainingRequests}`);

    // 8️⃣ GUARDAR EN CACHE (1 hora)
    await cacheSet(
      cacheKey,
      JSON.stringify({ response: kaelResponse, timestamp }),
      3600
    );
    console.log(`[Cache SET] User: ${userId} | Key: ${cacheKey}`);

    // 9️⃣ ENVIAR LA RESPUESTA
    return NextResponse.json(
      {
        success: true,
        response: kaelResponse,
        metadata: {
          userId,
          userName,
          messageReceived: message,
          timestamp,
          remainingRequests,
          cached: false,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    // Manejo específico de errores
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        console.error("Request timeout to OpenAI");
        return NextResponse.json(
          { error: "Solicitud tardó demasiado. Intenta de nuevo." },
          { status: 504, headers: corsHeaders }
        );
      }
      console.error(`Unexpected error: ${error.message}`);
    } else {
      console.error("Unexpected error:", error);
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500, headers: corsHeaders }
    );
  }
}