import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

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

    // 3️⃣ VERIFICAR API KEY
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
      console.error("OPENAI_API_KEY not configured");
      return NextResponse.json(
        { error: "Servicio no disponible" },
        { status: 503, headers: corsHeaders }
      );
    }

    // 4️⃣ LLAMADA A OPENAI CON TIMEOUT Y VALIDACIÓN
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos de timeout

    let aiResponse;
    try {
      aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiApiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Eres Kael, un asistente virtual inteligente, amigable y muy útil. Estás hablando con ${userName}. Responde de forma clara y concisa.`,
            },
            {
              role: "user",
              content: message,
            },
          ],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // 5️⃣ VALIDAR RESPONSE DE OPENAI
    if (!aiResponse.ok) {
      const errorData = await aiResponse.json().catch(() => ({}));
      console.error(`OpenAI API error: ${aiResponse.status}`, errorData);

      if (aiResponse.status === 429) {
        return NextResponse.json(
          { error: "OpenAI sobrecargado. Intenta más tarde." },
          { status: 503, headers: corsHeaders }
        );
      }

      if (aiResponse.status === 401) {
        console.error("Invalid OpenAI API key");
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

    const aiData = await aiResponse.json();

    // 6️⃣ VALIDAR ESTRUCTURA DE RESPONSE
    if (
      !aiData.choices ||
      !Array.isArray(aiData.choices) ||
      aiData.choices.length === 0 ||
      !aiData.choices[0].message ||
      !aiData.choices[0].message.content
    ) {
      console.error("Unexpected OpenAI response structure", aiData);
      return NextResponse.json(
        { error: "Respuesta inesperada del servicio" },
        { status: 502, headers: corsHeaders }
      );
    }

    const kaelResponse = aiData.choices[0].message.content;

    // 📊 AUDITORÍA - Registrar uso de API
    console.log(`[API Call] User: ${userId} (${userName}) | Tokens: ${aiData.usage?.total_tokens || "unknown"} | Remaining: ${remainingRequests}`);

    // 7️⃣ ENVIAR LA RESPUESTA
    return NextResponse.json(
      {
        success: true,
        response: kaelResponse,
        metadata: {
          userId,
          userName,
          messageReceived: message,
          timestamp: new Date().toISOString(),
          remainingRequests,
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