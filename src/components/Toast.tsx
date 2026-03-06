"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type ToastType = "success" | "error" | "info";
interface Toast { id: number; message: string; type: ToastType; }
interface ToastCtx { toast: (msg: string, type?: ToastType) => void; success: (msg: string) => void; error: (msg: string) => void; }

const Ctx = createContext<ToastCtx>({ toast: () => {}, success: () => {}, error: () => {} });

let _id = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++_id;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const success = useCallback((msg: string) => toast(msg, "success"), [toast]);
  const error = useCallback((msg: string) => toast(msg, "error"), [toast]);

  const icons = { success: "✓", error: "✕", info: "ℹ" };
  const colors = { success: "#10B981", error: "#EF4444", info: "#6366F1" };
  const bgs = { success: "rgba(16,185,129,0.1)", error: "rgba(239,68,68,0.1)", info: "rgba(99,102,241,0.1)" };

  return (
    <Ctx.Provider value={{ toast, success, error }}>
      {children}
      {/* Toast container */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 10, background: "var(--surface)", border: `1px solid ${colors[t.type]}40`, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", backdropFilter: "blur(10px)", minWidth: 240, maxWidth: 360, animation: "slideUp 0.2s ease", pointerEvents: "auto" }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: bgs[t.type], display: "flex", alignItems: "center", justifyContent: "center", color: colors[t.type], fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{icons[t.type]}</div>
            <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 500, flex: 1 }}>{t.message}</span>
          </div>
        ))}
      </div>
      <style>{`@keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
