import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

// 🔐 RATE LIMITING FOR SYSTEM STATUS ENDPOINT
const statusRateLimit = new Map<string, { count: number; resetTime: number }>();
const STATUS_RATE_LIMIT = 30; // 30 requests per hour
const STATUS_RATE_WINDOW = 3600000; // 1 hour

function checkStatusRateLimit(ip: string): boolean {
  const now = Date.now();
  const userData = statusRateLimit.get(ip);

  if (!userData || now > userData.resetTime) {
    statusRateLimit.set(ip, { count: 1, resetTime: now + STATUS_RATE_WINDOW });
    return true;
  }

  if (userData.count >= STATUS_RATE_LIMIT) {
    return false;
  }

  userData.count++;
  return true;
}

// 🔐 AUTHENTICATION CHECK
function isAuthorized(authHeader: string | null): boolean {
  if (!authHeader) return false;
  const token = authHeader.split(" ")[1];
  if (!token) return false;

  // Verificar token - puede ser:
  // 1. Una variable de entorno SYSTEM_STATUS_TOKEN
  // 2. Un JWT válido (implementado en el futuro)
  const validToken = process.env.SYSTEM_STATUS_TOKEN;
  return validToken && token === validToken;
}

export async function GET(req: Request) {
  // Get client IP
  const ip = req.headers.get("cf-connecting-ip") ||
             req.headers.get("x-forwarded-for")?.split(",")[0] ||
             "unknown";

  // Check rate limit
  if (!checkStatusRateLimit(ip)) {
    console.warn(`[Security] Rate limit exceeded for /api/system/status from ${ip}`);
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 30 requests per hour." },
      { status: 429 }
    );
  }

  // Check authentication (optional but recommended)
  const authHeader = req.headers.get("authorization");
  const requiresAuth = process.env.SYSTEM_STATUS_REQUIRE_AUTH === "true";

  if (requiresAuth && !isAuthorized(authHeader)) {
    console.warn(`[Security] Unauthorized access attempt to /api/system/status from ${ip}`);
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  const status: any = {
    timestamp: new Date().toISOString(),
    services: {},
    logs: [],
  };

  try {
    // 1️⃣ DATABASE CHECK
    try {
      await prisma.$queryRaw`SELECT 1`;
      status.services.database = {
        status: "✅ Healthy",
        description: "PostgreSQL está conectado y respondiendo",
      };
    } catch (err) {
      status.services.database = {
        status: "❌ Error",
        description: "No se puede conectar a PostgreSQL",
      };
    }

    // 2️⃣ REDIS CHECK
    try {
      const redis = getRedis();
      const info = await redis.info("stats");
      const lines = info.split("\r\n");
      const connected_clients = lines.find((l) => l.includes("connected_clients"));
      const total_commands_processed = lines.find((l) =>
        l.includes("total_commands_processed")
      );

      status.services.redis = {
        status: "✅ Healthy",
        description: "Redis está conectado y cacheando",
        stats: {
          connected_clients: connected_clients?.split(":")[1] || "0",
          total_commands: total_commands_processed?.split(":")[1] || "0",
        },
      };
    } catch (err) {
      status.services.redis = {
        status: "⚠️ Unavailable",
        description: "Redis no está disponible (fallback automático activado)",
      };
    }

    // 3️⃣ SYSTEM LOGS (SANITIZED - No sensitive info)
    try {
      const { stdout } = await execPromise(
        "journalctl -u kael-web -n 20 --no-pager --output=short-iso"
      );
      const logs = stdout
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const parts = line.split(" ");
          const timestamp = parts[0];
          let message = parts.slice(4).join(" ");

          // 🔐 SANITIZE: Remove sensitive information
          // Hide API keys, passwords, tokens, emails
          message = message
            .replace(/sk-[a-zA-Z0-9]{48}/g, "sk-***HIDDEN***")
            .replace(/Bearer [a-zA-Z0-9\-._~+/]+=*/g, "Bearer ***HIDDEN***")
            .replace(/password[:\s"']+[^\s"']+/gi, "password:***HIDDEN***")
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "***EMAIL***");

          return { timestamp, message };
        });

      status.logs = logs.slice(-10); // Últimos 10 logs
    } catch (err) {
      status.logs = [
        { timestamp: new Date().toISOString(), message: "No logs available" },
      ];
    }

    // 4️⃣ UPTIME
    try {
      const { stdout } = await execPromise(
        "systemctl status kael-web --no-pager | grep Active"
      );
      status.uptime = stdout.trim();
    } catch (err) {
      status.uptime = "Unable to fetch";
    }

    return NextResponse.json(status, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: "Error fetching system status",
        services: {
          database: { status: "❌ Unknown" },
          redis: { status: "❌ Unknown" },
        },
      },
      { status: 503 }
    );
  }
}
