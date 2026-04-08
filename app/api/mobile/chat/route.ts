import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

export async function POST(req: Request) {
  try {
    // 1. Verificar la "llave" (Token JWT)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Token faltante" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    let decoded;
    try {
      const { payload } = await jwtVerify(token, secret);
      decoded = payload;
    } catch (err) {
      return NextResponse.json({ error: "Token inválido" }, { status: 403 });
    }

    const { message } = await req.json();
    if (!message) {
      return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
    }

    // 2. Extraer datos del usuario del token
    const userId = decoded.userId as string;
    const userName = decoded.name as string;

    // 3. Aquí es donde conectas con n8n o Anthropic
    // Por ahora, simularemos la respuesta de Kael
    const kaelResponse = `Recibido, ${userName}. Analizando: "${message}". No rompas nada mientras espero.`;

    return NextResponse.json({
      success: true,
      response: kaelResponse,
      metadata: {
        userId,
        messageReceived: message,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    return NextResponse.json({ error: "Token inválido o error de servidor" }, { status: 403 });
  }
}