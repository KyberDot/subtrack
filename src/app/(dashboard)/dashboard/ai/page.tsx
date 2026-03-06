"use client";
import { useState, useRef, useEffect } from "react";
import { useSubscriptions } from "@/lib/useSubscriptions";
import { useSettings } from "@/lib/SettingsContext";

interface Message { role: "user" | "assistant"; text: string; }

const SUGGESTIONS = [
  "What's my most expensive subscription?",
  "Add Spotify $9.99 monthly",
  "How much am I spending on entertainment?",
  "What can I cancel to save money?",
];

export default function AIPage() {
  const { reload } = useSubscriptions();
  const { t } = useSettings();
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi! I can help you manage your subscriptions. Try asking me to add one, or ask about your spending.\n\nExamples:\n• \"Add Netflix $17.99 monthly\"\n• \"What's my biggest expense?\"\n• \"Am I spending too much on software?\"" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const history = messages.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0).map(m => ({ role: m.role, content: m.text }));
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: msg }] }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
      if (data.actionResult) reload();
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, something went wrong. Please try again." }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px - 48px)" }} className="fade-in">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>AI Agent</h1>
        <p style={{ color: "var(--muted)", fontSize: 14 }}>Add subscriptions with natural language or ask about your spending</p>
      </div>

      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", padding: 0, minHeight: 0 }}>
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-start" }}>
              {m.role === "assistant" && (
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "#6366F1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 2 }}>🤖</div>
              )}
              <div style={{ maxWidth: "75%", padding: "10px 14px", borderRadius: 12, background: m.role === "user" ? "#6366F1" : "var(--surface2)", color: m.role === "user" ? "white" : "var(--text)", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#6366F1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🤖</div>
              <div style={{ padding: "10px 14px", background: "var(--surface2)", borderRadius: 12, fontSize: 14, color: "var(--muted)" }}>Thinking...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div style={{ padding: 16, borderTop: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)} style={{ padding: "4px 10px", borderRadius: 99, border: "1px solid var(--border-color)", background: "transparent", color: "var(--muted)", fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={e => { (e.target as any).style.borderColor = "#6366F1"; (e.target as any).style.color = "#6366F1"; }}
                onMouseLeave={e => { (e.target as any).style.borderColor = "var(--border-color)"; (e.target as any).style.color = "var(--muted)"; }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Ask anything or say 'Add Netflix $17.99 monthly'..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} style={{ flex: 1 }} />
            <button className="btn-primary" onClick={() => send()} disabled={loading || !input.trim()}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}
