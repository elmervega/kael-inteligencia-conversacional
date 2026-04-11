"use client";

import { useEffect, useState } from "react";

interface SystemStatus {
  timestamp: string;
  services: {
    database?: { status: string; description: string };
    redis?: { status: string; description: string; stats?: any };
  };
  logs: Array<{ timestamp: string; message: string }>;
  uptime?: string;
}

export default function DashboardSistema() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/system/status");
      const data = await res.json();
      setStatus(data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching status:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Actualizar cada 10 segundos
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p>Cargando estado del sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">📊 Estado del Sistema Kael</h1>
          <p className="text-zinc-400">
            Último update: {lastUpdate?.toLocaleTimeString("es-ES")} | Auto-refresh cada 10s
          </p>
        </div>

        {/* Services Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Database Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-blue-500/50 transition">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">🗄️ Base de Datos</h2>
                <p className="text-sm text-zinc-400">PostgreSQL</p>
              </div>
            </div>
            <div
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                status?.services.database?.status?.includes("✅")
                  ? "bg-green-900/30 text-green-400 border border-green-700"
                  : "bg-red-900/30 text-red-400 border border-red-700"
              }`}
            >
              {status?.services.database?.status}
            </div>
            <p className="text-zinc-300 text-sm">
              {status?.services.database?.description}
            </p>
          </div>

          {/* Redis Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-red-500/50 transition">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold mb-1">⚡ Cache (Redis)</h2>
                <p className="text-sm text-zinc-400">Sistema de cacheo rápido</p>
              </div>
            </div>
            <div
              className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                status?.services.redis?.status?.includes("✅")
                  ? "bg-green-900/30 text-green-400 border border-green-700"
                  : "bg-yellow-900/30 text-yellow-400 border border-yellow-700"
              }`}
            >
              {status?.services.redis?.status}
            </div>
            <p className="text-zinc-300 text-sm mb-3">
              {status?.services.redis?.description}
            </p>
            {status?.services.redis?.stats && (
              <div className="bg-black/50 rounded p-2 text-xs space-y-1">
                <p>📡 Clientes: {status.services.redis.stats.connected_clients}</p>
                <p>📊 Comandos: {status.services.redis.stats.total_commands}</p>
              </div>
            )}
          </div>
        </div>

        {/* Uptime Card */}
        {status?.uptime && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-3">⏱️ Tiempo de Ejecución</h2>
            <p className="text-zinc-300 font-mono text-sm">{status.uptime}</p>
          </div>
        )}

        {/* Logs Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">📋 Últimos Registros (Logs)</h2>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {status?.logs && status.logs.length > 0 ? (
              status.logs.map((log, idx) => (
                <div
                  key={idx}
                  className="bg-black/50 rounded p-3 text-xs border border-zinc-800 hover:border-zinc-600 transition"
                >
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-zinc-400">
                      {new Date(log.timestamp).toLocaleTimeString("es-ES")}
                    </span>
                    <span className="text-zinc-300 flex-1">
                      {log.message.substring(0, 150)}
                      {log.message.length > 150 ? "..." : ""}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-zinc-500 text-sm">No hay logs disponibles</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-zinc-500 text-sm">
          <p>💡 Este dashboard se actualiza automáticamente cada 10 segundos</p>
          <p>API Endpoint: <code className="bg-black px-2 py-1 rounded text-zinc-300">/api/system/status</code></p>
        </div>
      </div>
    </div>
  );
}
