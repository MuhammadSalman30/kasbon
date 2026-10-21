"use client";
import { useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import { formatRupiah, paidOf, paymentSchema, relativeTime, remainingOf, todayISO, type Debt, type PaymentInput } from "@/lib/debt";

export default function PaymentSheet({ debt, onAdd, onRemove, onClose }: {
    debt: Debt;
    onAdd: (v: PaymentInput) => Promise<void>;
    onRemove: (PaymentId: string) => Promise<void>;
    onClose: () => void;
}) {
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(todayISO());
    const [note, setNote] = useState("");
    const [err, setErr] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const paid = paidOf(debt);
    const remaining = remainingOf(debt);
    const pct = Math.min(100, Math.round((paid / debt.amount) * 100));
    const field = "w-full rounded-xl border border-ink/15 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-pos/20";

    async function run(fn: () => Promise<void>) {
        setBusy(true); setErr(null);
        try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Gagal");}
        setBusy(false);
    }

    async function submit(e: React.SyntheticEvent) {
        e.preventDefault();
        const parsed = paymentSchema.safeParse({ amount: amount === "" ? undefined : Number(amount), paid_at: date || undefined, note: note || null });
        if (!parsed.success) return setErr(parsed.error.issues[0].message);
        if (parsed.data.amount > remaining) return setErr(`Maksimal ${formatRupiah(remaining)} (sisa hutang)`);
        await run(async () => { await onAdd(parsed.data); setAmount(""); setNote(""); });
    }

    return (
    <div className="fixed inset-0 z-20 flex items-end bg-ink/50 sm:items-center sm:justify-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-dvh w-full space-y-4 overflow-y-auto rounded-t-3xl bg-paper p-5 sm:max-w-md sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Cicilan · {debt.counterpart_name}</h2>
          <button type="button" onClick={onClose} aria-label="Tutup" className="rounded-full p-2 hover:bg-ink/10"><X className="size-5" /></button>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-ink/60">Terbayar {formatRupiah(paid)} dari {formatRupiah(debt.amount)}</span>
            <span className="font-bold">{pct}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-pos transition-all duration-500" style={{ width: `${pct}%` }} /></div>
          <p className="mt-1 text-sm font-semibold">{remaining === 0 ? "Udah lunas 🎉" : `Sisa ${formatRupiah(remaining)}`}</p>
        </div>

        {remaining > 0 && (
          <form onSubmit={submit} className="space-y-3">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/50">Rp</span>
              <input className={field + " pl-11"} type="number" inputMode="numeric" min={1} step={1} placeholder="Jumlah dibayar" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <button type="button" onClick={() => setAmount(String(remaining))} className="text-sm font-semibold text-pos underline">Lunasi sisa ({formatRupiah(remaining)})</button>
            <input className={field} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <input className={field} placeholder="Catatan (opsional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
            {err && <p role="alert" className="text-sm text-neg">{err}</p>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 font-semibold text-white active:scale-[.98] disabled:opacity-60">
              {busy && <Loader2 className="size-4 animate-spin" />}Catat pembayaran
            </button>
          </form>
        )}
        {remaining === 0 && err && <p role="alert" className="text-sm text-neg">{err}</p>}

        <div>
          <p className="mb-2 text-sm font-bold">Riwayat bayar</p>
          {debt.payments.length === 0 ? (
            <p className="text-sm text-ink/60">Belum ada pembayaran.</p>
          ) : (
            <ul className="space-y-2">
              {[...debt.payments].sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1)).map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold">{formatRupiah(p.amount)}</p>
                    <p className="truncate text-xs text-ink/60">{relativeTime(p.paid_at)}{p.note ? ` · ${p.note}` : ""}</p>
                  </div>
                  <button disabled={busy} onClick={() => void run(() => onRemove(p.id))} aria-label="Hapus pembayaran" className="rounded-lg p-2 text-neg hover:bg-neg/10 disabled:opacity-50"><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}