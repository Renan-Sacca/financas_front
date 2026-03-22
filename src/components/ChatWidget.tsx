import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";

interface Message {
  id: number;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
}

const API_URL = import.meta.env.VITE_API_URL;

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      text: "Olá! Sou o assistente financeiro. Como posso te ajudar?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(generateSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: nextId.current++,
      text,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      });

      if (!res.ok) throw new Error("Erro na resposta");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          text: data.reply || "Desculpe, não consegui processar sua mensagem.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: nextId.current++,
          text: "Erro ao conectar com o assistente. Tente novamente.",
          sender: "bot",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const chatWindow = isOpen && (
    <div
      style={{
        position: "fixed",
        bottom: "6rem",
        right: "1rem",
        zIndex: 9999,
        width: "360px",
        maxWidth: "calc(100vw - 2rem)",
        height: "500px",
        maxHeight: "calc(100vh - 8rem)",
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(32px) saturate(200%)",
        WebkitBackdropFilter: "blur(32px) saturate(200%)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6)",
        borderRadius: "1rem",
        display: "flex",
        flexDirection: "column" as const,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#007bff]" />
          <span className="font-heading text-sm font-semibold text-white/90">
            Assistente Financeiro
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/40 hover:text-white transition-colors cursor-pointer"
          aria-label="Fechar chat"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "bot" && (
              <div className="w-7 h-7 rounded-full bg-[#007bff]/20 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-[#007bff]" />
              </div>
            )}
            <div
              className={`max-w-[75%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-[#007bff] text-white rounded-br-sm"
                  : "bg-white/5 text-white/80 border border-white/10 rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
            {msg.sender === "user" && (
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-white/60" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-[#007bff]/20 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-[#007bff]" />
            </div>
            <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl rounded-bl-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            disabled={loading}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-[#007bff]/50 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-[#007bff] hover:bg-[#007bff]/80 disabled:opacity-30 text-white rounded-xl px-3 py-2.5 transition-colors cursor-pointer disabled:cursor-not-allowed"
            aria-label="Enviar mensagem"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const fab = (
    <button
      onClick={() => setIsOpen((prev) => !prev)}
      style={{ position: "fixed", bottom: "1.5rem", right: "1rem", zIndex: 9999 }}
      className="w-14 h-14 bg-[#007bff] hover:bg-[#007bff]/80 text-white rounded-full shadow-lg shadow-blue-900/40 flex items-center justify-center transition-all cursor-pointer hover:scale-105"
      aria-label={isOpen ? "Fechar chat" : "Abrir chat"}
    >
      {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
    </button>
  );

  return createPortal(
    <>
      {chatWindow}
      {fab}
    </>,
    document.body
  );
}
