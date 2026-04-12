"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const KaelIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
    <path d="M12 2L5 9L12 16L19 9L12 2Z" />
    <path d="M12 22L5 15L12 8L19 15L12 22Z" />
    <path d="M5 9L19 9" />
    <path d="M5 15L19 15" />
    <path d="M12 8L12 16" />
  </svg>
);

/* ── Markdown components con estilos del tema oscuro ── */
const markdownComponents: React.ComponentProps<typeof ReactMarkdown>["components"] = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
  h1: ({ children }) => <h1 className="text-base font-bold text-white mt-3 mb-1 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold text-white mt-3 mb-1 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-100 mt-2 mb-1 first:mt-0">{children}</h3>,
  ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-2 text-slate-300">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-2 text-slate-300">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-indigo-500/60 pl-3 my-2 text-slate-400 italic">
      {children}
    </blockquote>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-400 underline underline-offset-2 hover:text-indigo-300 transition-colors"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="bg-slate-900/80 border border-slate-700/60 rounded-lg p-3 overflow-x-auto my-2 text-xs font-mono">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = !!className;
    return isBlock ? (
      <code className={`${className} text-slate-300 text-xs`}>{children}</code>
    ) : (
      <code className="bg-slate-800/80 text-indigo-300 px-1.5 py-0.5 rounded text-[0.78em] font-mono border border-slate-700/40">
        {children}
      </code>
    );
  },
  hr: () => <hr className="border-slate-700/50 my-3" />,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs border-collapse w-full">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-left text-slate-300 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-slate-700/60 px-3 py-1.5 text-slate-400">{children}</td>
  ),
};

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Redirigir si no hay sesión
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // Tarea 3: Cargar historial desde localStorage cuando la sesión está lista
  useEffect(() => {
    if (status === "authenticated" && session?.user?.email && !hydrated) {
      try {
        const key = `kael-chat-${session.user.email}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed: Message[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
      } catch {
        // localStorage inaccesible — continuar sin historial
      }
      setHydrated(true);
    }
  }, [status, session, hydrated]);

  // Tarea 3: Persistir historial en localStorage cuando messages cambia
  useEffect(() => {
    if (!hydrated || !session?.user?.email) return;
    try {
      const key = `kael-chat-${session.user.email}`;
      if (messages.length > 0) {
        localStorage.setItem(key, JSON.stringify(messages));
      }
    } catch {
      // Silencioso — localStorage puede estar deshabilitado
    }
  }, [messages, hydrated, session]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      // Tarea 1: Enviar historial completo para contexto (ya implementado)
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();

      if (data.remaining !== undefined) setRemaining(data.remaining);

      if (res.status === 429) {
        setRateLimited(true);
      }

      if (!res.ok || !data.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            content: `⚠️ ${data.error ?? "Error al conectar. Intenta de nuevo."}`,
          },
        ]);
        return;
      }

      setRateLimited(false);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: data.response },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: "📡 No me pude conectar. Verifica tu conexión e intenta de nuevo.",
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [inputText, isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setRemaining(null);
    // Tarea 3: Limpiar también el localStorage al limpiar la conversación
    if (session?.user?.email) {
      try {
        localStorage.removeItem(`kael-chat-${session.user.email}`);
      } catch {}
    }
  };

  // Loading de sesión
  if (status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-56px)] md:h-screen" style={{ backgroundColor: "#000318" }}>
        <div className="flex gap-2">
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  const firstName = session?.user?.name?.split(" ")[0] ?? "Usuario";

  return (
    <div
      className="flex flex-col h-[calc(100vh-56px)] md:h-screen"
      style={{ backgroundColor: "#000318" }}
    >
      {/* Header */}
      <div className="bg-[#000318]/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="kael-avatar-animate w-10 h-10 rounded-full flex items-center justify-center border border-indigo-900/40 bg-indigo-950/30 shrink-0">
            <KaelIcon className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-sm leading-tight">Kael Assistant</h1>
            <p className="text-xs text-green-500 font-medium">En línea</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {remaining !== null && (
            <span className="text-[0.68rem] text-zinc-600">
              {remaining} mensajes restantes
            </span>
          )}
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-1 rounded"
              title="Limpiar conversación"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 kael-scroll relative">
        {/* Fondo geométrico */}
        <div
          className="absolute inset-0 z-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#2d3748 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        />

        {/* Estado vacío */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 relative z-10 pb-8">
            <div className="kael-avatar-animate w-20 h-20 rounded-full flex items-center justify-center mb-5 border border-indigo-900/40 bg-indigo-950/30">
              <KaelIcon className="w-10 h-10 text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Hola, {firstName}</h2>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
              Soy Kael — tu asistente inteligente. ¿En qué puedo ayudarte hoy?
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                "¿Qué puedes hacer?",
                "Redacta un email profesional",
                "Dame ideas creativas",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInputText(suggestion)}
                  className="text-xs text-zinc-500 border border-zinc-800 rounded-full px-3 py-1.5 hover:border-indigo-700 hover:text-zinc-300 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mensajes */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full kael-fade-in relative z-10 ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-indigo-950 flex items-center justify-center mr-2.5 mt-auto mb-1 border border-indigo-900/40 shrink-0">
                <KaelIcon className="w-3.5 h-3.5 text-indigo-400" />
              </div>
            )}
            <div
              className={`px-5 py-3.5 max-w-[75%] text-[14px] leading-relaxed break-words transition-all duration-200 hover:-translate-y-0.5 ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 text-white rounded-[20px] rounded-br-sm shadow-[0_0_15px_-3px_rgba(79,70,229,.35)] whitespace-pre-wrap"
                  : "bg-[#0a0f26] text-slate-200 border border-slate-800 rounded-[20px] rounded-bl-sm"
              }`}
            >
              {/* Tarea 2: Markdown solo en mensajes del asistente */}
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Indicador de escritura */}
        {isLoading && (
          <div className="flex justify-start items-end kael-fade-in relative z-10">
            <div className="w-7 h-7 rounded-full bg-indigo-950 flex items-center justify-center mr-2.5 mb-1 border border-indigo-900/40 shrink-0">
              <KaelIcon className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="bg-[#0a0f26] border border-slate-800 px-5 py-3.5 rounded-[20px] rounded-bl-sm flex gap-1.5 items-center">
              {[0, 150, 300].map((delay) => (
                <div
                  key={delay}
                  className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce shadow-[0_0_8px_1px_rgba(129,140,248,.5)]"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Banner de rate limit — aparece cuando el usuario agota sus mensajes */}
      {rateLimited && (
        <div className="mx-4 mb-3 shrink-0 z-10">
          <div className="bg-gradient-to-r from-violet-950/70 to-indigo-950/70 border border-violet-500/30 rounded-2xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">💎</span>
              <div>
                <p className="text-sm font-semibold text-white">Alcanzaste tu límite del plan Free</p>
                <p className="text-xs text-zinc-400 mt-0.5">Actualiza a Pro para seguir chateando — 500 mensajes al mes</p>
              </div>
            </div>
            <a
              href="/dashboard/plan"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl hover:from-indigo-500 hover:to-violet-500 transition-all shrink-0 shadow-lg"
            >
              Actualizar a Pro
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                <path d="M7 17L17 7M17 7H7M17 7v10"/>
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-[#000318] border-t border-slate-800 px-6 py-4 shrink-0 z-10">
        <div className="flex items-center gap-2 bg-[#0a0f26] px-2 py-1.5 rounded-full border border-slate-800 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-800/40 transition-all duration-200">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escríbele a Kael..."
            disabled={isLoading}
            className="flex-1 bg-transparent border-none px-4 py-2.5 focus:outline-none text-slate-100 placeholder-slate-600 text-sm font-light disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputText.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white disabled:bg-slate-800 disabled:opacity-40 hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all shrink-0 shadow-[0_0_12px_2px_rgba(79,70,229,.25)] disabled:shadow-none"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 ml-0.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-center text-[0.65rem] text-zinc-700 mt-2">
          Kael puede cometer errores — verifica información importante
        </p>
      </div>
    </div>
  );
}
