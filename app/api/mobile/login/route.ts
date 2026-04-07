import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Tu cliente de Prisma
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // 1. Buscar al usuario
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password_hash) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // 2. Verificar contraseña
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    // 3. Crear Token para la App (JWT)
    // Usa una clave secreta de tu .env
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      process.env.NEXTAUTH_SECRET!,
      { expiresIn: "30d" }
    );

    // 4. Devolver datos a FlutterFlow
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 });
  }
}