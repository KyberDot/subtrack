"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Subscription } from "@/types";

// Module-level cache - shared across all hook instances
let _cache: Subscription[] | null = null;
let _cacheTime = 0;
let _inflightPromise: Promise<Subscription[]> | null = null;
const CACHE_TTL = 30_000; // 30 seconds
const listeners = new Set<(subs: Subscription[]) => void>();

function notifyAll(subs: Subscription[]) {
  _cache = subs;
  _cacheTime = Date.now();
  listeners.forEach(fn => fn(subs));
}

async function fetchSubs(): Promise<Subscription[]> {
  if (_inflightPromise) return _inflightPromise;
  _inflightPromise = fetch("/api/subscriptions")
    .then(r => r.json())
    .then(data => {
      const subs = Array.isArray(data) ? data.map((s: any) => ({
        ...s, type: s.type || "subscription", trial: !!s.trial,
        active: s.active !== 0 && s.active !== false,
      })) : [];
      notifyAll(subs);
      _inflightPromise = null;
      return subs;
    })
    .catch(() => { _inflightPromise = null; return _cache || []; });
  return _inflightPromise;
}

export function useSubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>(_cache || []);
  const [loading, setLoading] = useState(!_cache);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const handler = (newSubs: Subscription[]) => { if (mounted.current) setSubs(newSubs); };
    listeners.add(handler);

    // Use cache if fresh, else fetch
    if (_cache && (Date.now() - _cacheTime) < CACHE_TTL) {
      setSubs(_cache);
      setLoading(false);
    } else {
      setLoading(true);
      fetchSubs().then(() => { if (mounted.current) setLoading(false); });
    }

    return () => { mounted.current = false; listeners.delete(handler); };
  }, []);

  const add = async (data: Partial<Subscription>) => {
    const r = await fetch("/api/subscriptions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!r.ok) { const e = await r.json(); throw new Error(e.error || "Failed to add"); }
    const sub = await r.json();
    const normalised = { ...sub, trial: !!sub.trial, active: sub.active !== 0 };
    const next = [...(_cache || []), normalised];
    notifyAll(next);
  };

  const update = async (id: number, data: Partial<Subscription>) => {
    const r = await fetch(`/api/subscriptions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const updated = await r.json();
    const next = (_cache || []).map(s => s.id === id ? { ...s, ...updated, trial: !!updated.trial, active: updated.active !== 0 } : s);
    notifyAll(next);
  };

  const remove = async (id: number) => {
    await fetch(`/api/subscriptions/${id}`, { method: "DELETE" });
    notifyAll((_cache || []).filter(s => s.id !== id));
  };

  const reload = useCallback(() => {
    _cache = null; _cacheTime = 0;
    setLoading(true);
    return fetchSubs().then(() => setLoading(false));
  }, []);

  return { subs, loading, add, update, remove, reload };
}

// Call this to invalidate cache (e.g., after settings change)
export function invalidateSubsCache() { _cache = null; _cacheTime = 0; }
