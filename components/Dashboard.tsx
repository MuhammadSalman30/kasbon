"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, LogOut, NotebookPen, Pencil, Plus, Search, Trash2, Undo2, Users, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatRupiah, paidOf, relativeTime, remainingOf, type Debt } from "@/lib/debt";
import { useDebts, type Filters } from "./useDebts";
import DebtForm from "./DebtForm";
import PaymentSheet from "./PaymentSheet";

type Sort = "newest" | "oldest" | "high" | "low";
const sel = "rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-pos focus:ring-2 focus:ring-pos/20";
const dateOf = (x: Debt) => x.due_date ?? x.created_at;

export default function Dashboard() {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>({ status: "all", type: "all" });
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [grouped, setGrouped] = useState(false);
  const [form, setForm] = useState<{ open: boolean; debt?: Debt }>({ open: false });
  const [toDelete, setToDelete] = useState<Debt | null>(null);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const d = useDebts(filters);
  const net = d.owedToMe - d.iOwe;
  const maxBar = Math.max(d.owedToMe, d.iOwe, 1);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = (d.list ?? []).filter((x) => x.counterpart_name.toLowerCase().includes(q));
    return rows.sort((a, b) => {
      if (sort === "high") return b.amount - a.amount;
      if (sort === "low") return a.amount - b.amount;
      const cmp = dateOf(b) > dateOf(a) ? 1 : dateOf(b) < dateOf(a) ? -1 : 0;
      return sort === "newest" ? cmp : -cmp;
    });
  }, [d.list, search, sort]);

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; count: number; net: number }>();
    for (const x of shown) {
      const sisa = remainingOf(x);
      if (sisa === 0) continue;
      const k = x.counterpart_name.trim().toLowerCase();
      const g = map.get(k) ?? { name: x.counterpart_name, count: 0, net: 0 };
      g.count +=1;
      g.net += x.type === "owed_to_me" ? sisa : -sisa;
      map.set(k, g);
    }
    return [...map.values()].sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [shown]);

  async function run(fn: () => Promise<void>) {
    try { setActionErr(null); await fn(); } catch (e) { setActionErr(e instanceof Error ? e.message : "Gagal"); }
  }
  async function logout() { await createClient().auth.signOut(); router.replace("/login"); router.refresh(); }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-28 pt-5">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xl font-extrabold"><NotebookPen className="text-pos" /> Kasbon</div>
        <button onClick={logout} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-ink/70 transition hover:bg-ink/10"><LogOut className="size-4" />Keluar</button>
      </header>

      <section className="mb-6 rounded-3xl bg-ink p-5 text-white shadow-lg">
        <p className="text-sm text-white/60">Net (yang belum lunas)</p>
        <p className={`text-3xl font-extrabold tracking-tight ${net >= 0 ? "text-emerald-300" : "text-orange-300"}`}>{net < 0 ? "-" : ""}{formatRupiah(Math.abs(net))}</p>
        <div className="mt-5 space-y-3 text-sm">
          {([["Total dihutang ke saya", d.owedToMe, "bg-emerald-400"], ["Total saya hutang", d.iOwe, "bg-orange-400"]] as const).map(([label, val, color]) => (
            <div key={label}>
              <div className="mb-1 flex justify-between"><span className="text-white/60">{label}</span><span className="font-bold">{formatRupiah(val)}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${(val / maxBar) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama orang…" className={sel + " w-full pl-10"} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <select aria-label="Filter status" className={sel} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value as Filters["status"] })}>
          <option value="all">Semua status</option><option value="unsettled">Belum lunas</option><option value="settled">Lunas</option>
        </select>
        <select aria-label="Filter tipe" className={sel} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value as Filters["type"] })}>
          <option value="all">Semua tipe</option><option value="owed_to_me">Dihutang</option><option value="i_owe">Hutang</option>
        </select>
        <select aria-label="Urutkan" className={sel} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="newest">Terbaru</option><option value="oldest">Terlama</option><option value="high">Jumlah terbesar</option><option value="low">Jumlah terkecil</option>
        </select>
        <button onClick={() => setGrouped(!grouped)} aria-pressed={grouped} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${grouped ? "border-pos bg-pos/10 text-pos" : "border-ink/15 bg-white"}`}>
          <Users className="size-4" />Per orang
        </button>
      </div>

      {(d.error || actionErr) && <p role="alert" className="mb-3 rounded-xl bg-neg/10 p-3 text-sm text-neg">{actionErr ?? d.error} {d.error && <button className="underline" onClick={() => void d.reload()}>Coba lagi</button>}</p>}

      {d.list === null && !d.error ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-ink/10" />)}</div>
      ) : shown.length === 0 ? (
        <div className="py-16 text-center text-ink/60">
          <p className="font-semibold text-ink">{search ? `Gak ada yang cocok sama “${search}”` : "Belum ada catatan"}</p>
          <p className="text-sm">{search ? "Coba kata kunci lain." : "Pencet “Catat baru” buat mulai nyatet."}</p>
        </div>
      ) : grouped ? (
        <ul className="space-y-3">
          {groups.length === 0 && <li className="py-10 text-center text-sm text-ink/60">Semua udah lunas 🎉</li>}
          {groups.map((g) => (
            <li key={g.name} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
              <div><p className="font-bold">{g.name}</p><p className="text-xs text-ink/60">{g.count} entry belum lunas</p></div>
              <p className={`font-extrabold ${g.net >= 0 ? "text-pos" : "text-neg"}`}>{g.net < 0 ? "-" : ""}{formatRupiah(Math.abs(g.net))}</p>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {shown.map((x) => {
            const lunas = !!x.settled_at, mine = x.type === "owed_to_me";
            const paid = paidOf(x), cicilan = paid > 0 && !lunas;
              return (
              <li key={x.id} className={`rounded-2xl border-l-4 bg-white p-4 shadow-sm transition ${mine ? "border-pos" : "border-neg"} ${lunas ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{x.counterpart_name}</p>
                    <p className="text-xs text-ink/60">{mine ? "Dihutang ke saya" : "Saya hutang"} · {relativeTime(dateOf(x))}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-extrabold ${mine ? "text-pos" : "text-neg"}`}>{formatRupiah(x.amount)}</p>
                    <span className={`text-xs font-semibold ${lunas ? "text-pos" : "text-ink/60"}`}>{lunas ? "Lunas" : cicilan ? `Sisa ${formatRupiah(remainingOf(x))}` : "Belum Lunas"}</span>
                  </div>
                </div>
                {cicilan && (
                  <div className="mt-3" aria-label={`Terbayar ${formatRupiah(paid)} dari ${formatRupiah(x.amount)}`}>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-pos transition-all duration-500" style={{ width: `${Math.min(100, (paid / x.amount) * 100)}%` }} /></div>
                    <p className="mt-1 text-xs text-ink/60">Terbayar {formatRupiah(paid)}</p>
                  </div>
                )}
                {x.note && <p className="mt-2 text-sm text-ink/70">{x.note}</p>}
                <div className="mt-3 flex gap-2 text-sm">
                  <button onClick={() => run(() => d.update(x.id, { settled: !lunas }))} className="flex items-center gap-1 rounded-lg bg-pos/10 px-3 py-1.5 font-semibold text-pos transition active:scale-95">
                    {lunas ? <><Undo2 className="size-4" />Batal lunas</> : <><Check className="size-4" />Tandai lunas</>}
                  </button>
                  <button onClick={() => setPayFor(x.id)} className="flex items-center gap-1 rounded-lg px-3 py-1.5 transition hover:bg-ink/10"><Wallet className="size-4" />Cicilan</button>
                  <button onClick={() => setForm({ open: true, debt: x })} className="flex items-center gap-1 rounded-lg px-3 py-1.5 transition hover:bg-ink/10"><Pencil className="size-4" />Edit</button>
                  <button onClick={() => setToDelete(x)} className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-neg transition hover:bg-neg/10"><Trash2 className="size-4" />Hapus</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <button onClick={() => setForm({ open: true })} className="fixed bottom-5 right-5 flex items-center gap-2 rounded-full bg-pos px-5 py-3.5 font-bold text-white shadow-lg transition active:scale-95">
        <Plus className="size-5" />Catat baru
      </button>

      {form.open && (
        <DebtForm key={form.debt?.id ?? "new"} initial={form.debt} onClose={() => setForm({ open: false })}
          onSubmit={(v) => (form.debt ? d.update(form.debt.id, v) : d.create(v))} />
      )}

      {payFor && (() => {
        const debt = d.list?.find((x) => x.id === payFor);
        return debt ? (
          <PaymentSheet debt={debt} onClose={() => setPayFor(null)}
            onAdd={(v) => d.addPayment(debt.id, v)} onRemove={(pid) => d.removePayment(debt.id, pid)} />
        ) : null;
        })
      ()}

      {toDelete && (
        <div className="fixed inset-0 z-20 flex items-end bg-ink/50 sm:items-center sm:justify-center" onClick={() => setToDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full space-y-4 rounded-t-3xl bg-paper p-5 sm:max-w-sm sm:rounded-3xl">
            <h2 className="text-lg font-bold">Hapus catatan ini?</h2>
            <p className="text-sm text-ink/70">{toDelete.counterpart_name} · {formatRupiah(toDelete.amount)}. Yang udah dihapus gak bisa dibalikin.</p>
            <div className="flex gap-2">
              <button onClick={() => setToDelete(null)} className="flex-1 rounded-xl border border-ink/15 bg-white py-3 font-semibold">Batal</button>
              <button onClick={() => { const t = toDelete; setToDelete(null); void run(() => d.remove(t.id)); }} className="flex-1 rounded-xl bg-neg py-3 font-semibold text-white">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}