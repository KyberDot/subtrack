"use client";
import { useState, useEffect, useCallback } from "react";
import { Subscription } from "@/types";

export function useSubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/subscriptions");
    const data = await res.json();
    setSubs(Array.isArray(data) ? data.map((s: any) => ({ ...s, trial: !!s.trial, active: !!s.active })) : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (sub: Partial<Subscription>) => {
    const res = await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
    const data = await res.json();
    setSubs(prev => [...prev, { ...data, trial: !!data.trial, active: !!data.active }]);
    return data;
  };

  const update = async (id: number, patch: Partial<Subscription>) => {
    const res = await fetch(`/api/subscriptions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    const data = await res.json();
    setSubs(prev => prev.map(s => s.id === id ? { ...data, trial: !!data.trial, active: !!data.active } : s));
  };

  const remove = async (id: number) => {
    await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    setSubs(prev => prev.filter(s => s.id !== id));
  };

  return { subs, loading, add, update, remove, reload: load };
}
