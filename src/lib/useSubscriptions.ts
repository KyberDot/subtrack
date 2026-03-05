"use client";
import { useState, useEffect, useCallback } from "react";
import { Subscription } from "@/types";

export function useSubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/subscriptions");
      const data = await r.json();
      if (Array.isArray(data)) {
        setSubs(data.map((s: any) => ({
          ...s,
          type: s.type || "subscription",
          trial: !!s.trial,
          active: s.active !== 0 && s.active !== false,
        })));
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  const add = async (data: Partial<Subscription>) => {
    const r = await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const sub = await r.json();
    setSubs(prev => [...prev, { ...sub, trial: !!sub.trial, active: sub.active !== 0 }]);
  };

  const update = async (id: number, data: Partial<Subscription>) => {
    const r = await fetch(`/api/subscriptions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const updated = await r.json();
    setSubs(prev => prev.map(s => s.id === id ? { ...s, ...updated, trial: !!updated.trial, active: updated.active !== 0 } : s));
  };

  const remove = async (id: number) => {
    await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    setSubs(prev => prev.filter(s => s.id !== id));
  };

  return { subs, loading, add, update, remove, reload: load };
}
