import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redis";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export async function GET() {
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

    // 3️⃣ SYSTEM LOGS
    try {
      const { stdout } = await execPromise(
        "journalctl -u kael-web -n 20 --no-pager --output=short-iso"
      );
      const logs = stdout
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          // Parse journalctl format: 2026-04-11T02:30:15.123456+00:00 hostname service[pid]: message
          const parts = line.split(" ");
          const timestamp = parts[0];
          const message = parts.slice(4).join(" ");
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
