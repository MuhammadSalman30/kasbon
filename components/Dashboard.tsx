"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, NotebookPen, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, relativeTime, type Debt } from "@/lib/debt";
import { useDebts, type Filters } from "./useDebts";
import DebtForm from "./DebtForm";

const sel = "rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-pos";

export default function Dashboard() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>({ status: "all", type: "all" });
  const [form, setForm] = useState<{ open: boolean; debt?: Debt }>({ open: false });
  const [actionErr, setActionErr] = useState<string | null>(null);
  const d = useDebts(filters);
  const net = d.owedToMe - d.iOwe;

  async function run(fn: () => Promise<void>) {
    try { setActionErr(null); await fn(); } catch (e) { setActionErr(e instanceof Error ? e.message : "Gagal"); }
  }
  async function logout() { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-extrabold"><NotebookPen className="text-pos" /> Kasbon</div>
        <button onClick={logout} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink/70 hover:bg-ink/10"><LogOut className="size-4" />Keluar</button>
      </header>

      <section className="mb-6 rounded-3xl bg-ink p-5 text-white">
        <p className="text-sm text-white/60">Net (yang belum lunas)</p>
        <p className={`text-3xl font-extrabold ${net >= 0 ? "text-emerald-300" : "text-orange-300"}`}>{net < 0 ? "-" : ""}{formatRupiah(Math.abs(net))}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-white/60">Total dihutang ke saya</p><p className="font-bold">{formatRupiah(d.owedToMe)}</p></div>
          <div><p className="text-white/60">Total saya hutang</p><p className="font-bold">{formatRupiah(d.iOwe)}</p></div>
        </div>
      </section>

      <div className="mb-4 flex gap-2">
        <select aria-label="Filter status" className={sel} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as Filters["status"] })}>
          <option value="all">Semua status</option><option value="unsettled">Belum lunas</option><option value="settled">Lunas</option>
        </select>
        <select aria-label="Filter tipe" className={sel} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value as Filters["type"] })}>
          <option value="all">Semua tipe</option><option value="owed_to_me">Dihutang</option><option value="i_owe">Hutang</option>
        </select>
      </div>

      {(d.error || actionErr) && <p role="alert" className="mb-3 rounded-xl bg-neg/10 p-3 text-sm text-neg">{actionErr ?? d.error} {d.error && <button className="underline" onClick={() => void d.reload()}>Coba lagi</button>}</p>}

      {d.list === null && !d.error ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-ink/10" />)}</div>
      ) : d.list?.length === 0 ? (
        <div className="py-16 text-center text-ink/60">
          <p className="font-semibold text-ink">Belum ada catatan</p>
          <p className="text-sm">Pencet “Catat baru” buat mulai nyatet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {d.list?.map((x) => {
            const lunas = !!x.settled_at, mine = x.type === "owed_to_me";
            return (
              <li key={x.id} className={`rounded-2xl bg-white p-4 shadow-sm ${lunas ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{x.counterpart_name}</p>
                    <p className="text-xs text-ink/60">{mine ? "Dihutang ke saya" : "Saya hutang"} · {relativeTime(x.due_date ?? x.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-extrabold ${mine ? "text-pos" : "text-neg"}`}>{formatRupiah(x.amount)}</p>
                    <span className={`text-xs font-semibold ${lunas ? "text-pos" : "text-ink/60"}`}>{lunas ? "Lunas" : "Belum lunas"}</span>
                  </div>
                </div>
                {x.note && <p className="mt-2 text-sm text-ink/70">{x.note}</p>}
                <div className="mt-3 flex gap-2 text-sm">
                  <button onClick={() => run(() => d.update(x.id, { settled: !lunas }))} className="flex items-center gap-1 rounded-lg bg-pos/10 px-3 py-1.5 font-semibold text-pos">
                    {lunas ? <><Undo2 className="size-4" />Batal lunas</> : <><Check className="size-4" />Tandai lunas</>}
                  </button>
                  <button onClick={() => setForm({ open: true, debt: x })} className="flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-ink/10"><Pencil className="size-4" />Edit</button>
                  <button onClick={() => { if (confirm(`Hapus catatan ${x.counterpart_name}?`)) void run(() => d.remove(x.id)); }} className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-neg hover:bg-neg/10"><Trash2 className="size-4" />Hapus</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button onClick={() => setForm({ open: true })} className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full bg-pos px-5 py-3.5 font-bold text-white shadow-lg active:scale-95">
        <Plus className="size-5" />Catat baru
      </button>

      {form.open && (
        <DebtForm key={form.debt?.id ?? "new"} initial={form.debt} onClose={() => setForm({ open: false })}
          onSubmit={(v) => (form.debt ? d.update(form.debt.id, v) : d.create(v))} />
      )}
    </main>
  );
}
