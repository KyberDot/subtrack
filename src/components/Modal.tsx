"use client";
import { useEffect, ReactNode } from "react";

interface ModalProps {
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxWidth?: number;
  footer?: ReactNode;
}

export default function Modal({ onClose, title, children, maxWidth = 480, footer }: ModalProps) {
  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(5px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflow: "hidden" }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "var(--surface)", borderRadius: 16, width: "100%", maxWidth, maxHeight: "90vh", display: "flex", flexDirection: "column", border: "1px solid var(--border-color)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)", overflow: "hidden" }}
      >
        {title && (
          <div style={{ padding: "18px 22px 16px", borderBottom: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>✕</button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {children}
        </div>
        {footer && (
          <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border-color)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0, background: "var(--surface)" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
