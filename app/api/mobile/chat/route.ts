import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// 🌟 1. EL PASE VIP (CORS HEADERS) 🌟
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// 🌟 2. LA PUERTA DEL EXPLORADOR (OPTIONS) 🌟
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    // 1. Verificar la "llave" (Token JWT)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Token faltante" }, { status: 401, headers: corsHeaders });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    let decoded;
    try {
      const { payload } = await jwtVerify(token, secret);
      decoded = payload;
    } catch (err) {
      return NextResponse.json({ error: "Token inválido" }, { status: 403, headers: corsHeaders });
    }

    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400, headers: corsHeaders });
    }

    // 2. Extraer datos del usuario del token
    const userId = decoded.userId as string;
    const userName = decoded.name as string;

    // 3. Respuesta de Kael
    const kaelResponse = `Recibido, ${userName}. Analizando: "${message}". No rompas nada mientras espero.`;

    return NextResponse.json({
      success: true,
      response: kaelResponse,
      metadata: {
        userId,
        messageReceived: message,
        timestamp: new Date().toISOString(),
      },
    }, { 
      status: 200, 
      headers: corsHeaders // <-- ¡Pase VIP en el éxito!
    });

  } catch (error) {
    return NextResponse.json({ error: "Token inválido o error de servidor" }, { status: 403, headers: corsHeaders });
  }
}