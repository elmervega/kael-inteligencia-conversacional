import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña requeridos" },
        { status: 400 }
      );
    }

    // 1. Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        password: true,
      },
    });

    if (!user) {
      console.log(`Mobile login: user not found for ${email}`);
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    if (!user.password) {
      console.log(`Mobile login: no password hash for user ${email}`);
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    console.log(`Mobile login attempt: ${email}, has password: ${!!user.password}`);

    // 2. Verificar contraseña
    let isValid = false;
    try {
      isValid = await bcrypt.compare(password, user.password);
    } catch (err) {
      console.error('bcrypt.compare error:', err);
      return NextResponse.json(
        { error: "Error al verificar contraseña" },
        { status: 500 }
      );
    }

    if (!isValid) {
      console.log(`Login failed: password mismatch for ${email}`);
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    // 3. Crear JWT token (30 días)
    const fullName = [user.firstName, user.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || user.email;

    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      name: fullName,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(secret);

    // 4. Retornar token y datos del usuario
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: fullName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Mobile login error:', error);
    return NextResponse.json(
      { error: "Error en el servidor" },
      { status: 500 }
    );
  }
}
