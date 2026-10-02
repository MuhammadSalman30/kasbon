"use client";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { createDebtSchema, todayISO, type Debt, type DebtInput, type DebtType } from "@/lib/debt";

export default function DebtForm({ initial, onSubmit, onClose }: {
  initial?: Debt; onSubmit: (v: DebtInput) => Promise<void>; onClose: () => void;
}) {
  const [type, setType] = useState<DebtType>(initial?.type ?? "owed_to_me");
  const [name, setName] = useState(initial?.counterpart_name ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.due_date ?? todayISO());
  const [note, setNote] = useState(initial?.note ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    const parsed = createDebtSchema.safeParse({ type, counterpart_name: name, amount: amount === "" ? undefined : Number(amount), due_date: date || null, note: note || null });
    if (!parsed.success) return setErr(parsed.error.issues[0].message);
    setBusy(true); setErr(null);
    try { await onSubmit(parsed.data); onClose(); }
    catch (x) { setErr(x instanceof Error ? x.message : "Gagal nyimpen"); setBusy(false); }
  }
  const field = "w-full rounded-xl border border-ink/15 bg-white px-4 py-3 outline-none focus:border-pos focus:ring-2 focus:ring-pos/20";

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-ink/50 sm:items-center sm:justify-center" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="max-h-dvh w-full space-y-3 overflow-y-auto rounded-t-3xl bg-paper p-5 sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{initial ? "Edit catatan" : "Catat baru"}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-full p-2 hover:bg-ink/10"><X className="size-5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2" role="radiogroup">
          {([["owed_to_me", "Saya dihutang"], ["i_owe", "Saya hutang"]] as const).map(([v, label]) => (
            <label key={v} className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-semibold ${type === v ? (v === "owed_to_me" ? "border-pos bg-pos/10 text-pos" : "border-neg bg-neg/10 text-neg") : "border-ink/15 bg-white"}`}>
              <input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v)} className="sr-only" />{label}
            </label>
          ))}
        </div>
        <input className={field} placeholder="Nama orangnya" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/50">Rp</span>
          <input className={field + " pl-11"} type="number" inputMode="numeric" min={1} step={1} placeholder="Jumlah" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <input className={field} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <div>
          <textarea className={field} rows={2} placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          <p className="text-right text-xs text-ink/50">{note.length}/200</p>
        </div>
        {err && <p role="alert" className="text-sm text-neg">{err}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 font-semibold text-white active:scale-[.98] disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" />}Simpan
        </button>
      </form>
    </div>
  );
}
