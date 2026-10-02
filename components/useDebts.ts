"use client";
import { useCallback, useEffect, useState } from "react";
import type { Debt, DebtInput } from "@/lib/debt";

export interface Filters { status: "all" | "unsettled" | "settled"; type: "all" | "owed_to_me" | "i_owe" }

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!res.ok) throw new Error(json.error ?? "Ada yang salah, coba lagi ya");
  return json.data as T;
}

export function useDebts(filters: Filters) {
  const [list, setList] = useState<Debt[] | null>(null);
  const [all, setAll] = useState<Debt[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ status: filters.status, type: filters.type }).toString();
      const [l, a] = await Promise.all([call<Debt[]>(`/api/debts?${qs}`), call<Debt[]>("/api/debts?status=unsettled")]);
      setList(l); setAll(a); setError(null);
    } catch (e) { setError(e instanceof Error ? e.message : "Gagal muat data"); }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  const mutate = async (fn: () => Promise<unknown>) => { await fn(); await load(); };
  return {
    list, error, reload: load,
    owedToMe: all.filter((d) => d.type === "owed_to_me").reduce((s, d) => s + d.amount, 0),
    iOwe: all.filter((d) => d.type === "i_owe").reduce((s, d) => s + d.amount, 0),
    create: (b: DebtInput) => mutate(() => call("/api/debts", { method: "POST", body: JSON.stringify(b) })),
    update: (id: string, b: Partial<DebtInput> & { settled?: boolean }) => mutate(() => call(`/api/debts/${id}`, { method: "PATCH", body: JSON.stringify(b) })),
    remove: (id: string) => mutate(() => call(`/api/debts/${id}`, { method: "DELETE" })),
  };
}
