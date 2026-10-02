import { z } from "zod";

export type DebtType = "owed_to_me" | "i_owe";
export interface Debt {
  id: string; user_id: string; type: DebtType; counterpart_name: string; amount: number;
  note: string | null; due_date: string | null; settled_at: string | null; created_at: string; updated_at: string;
}

const base = z.object({
  type: z.enum(["owed_to_me", "i_owe"], { error: "Tipe harus 'owed_to_me' atau 'i_owe'" }),
  counterpart_name: z.string({ error: "Nama wajib diisi" }).trim().min(1, "Nama wajib diisi").max(100, "Nama maksimal 100 karakter"),
  amount: z.number({ error: "Jumlah harus berupa angka" }).int("Jumlah harus bilangan bulat (Rupiah utuh)")
    .positive("Jumlah harus lebih dari 0").max(9_000_000_000_000, "Jumlah kegedean"),
  note: z.string().trim().max(200, "Catatan maksimal 200 karakter").nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD").nullable().optional(),
});
export const createDebtSchema = base;
export const updateDebtSchema = base.partial().extend({ settled: z.boolean({ error: "settled harus true/false" }).optional() });
export const listQuerySchema = z.object({
  status: z.enum(["all", "unsettled", "settled"]).default("all"),
  type: z.enum(["all", "owed_to_me", "i_owe"]).default("all"),
});
export type DebtInput = z.infer<typeof createDebtSchema>;

export const formatRupiah = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

export function relativeTime(dateStr: string, now = new Date()): string {
  const d = new Date(dateStr.length === 10 ? dateStr + "T00:00:00" : dateStr);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diff === 0) return "hari ini";
  if (diff === 1) return "kemarin";
  if (diff === -1) return "besok";
  if (diff < 0) return `${-diff} hari lagi`;
  if (diff < 7) return `${diff} hari lalu`;
  if (diff < 30) return `${Math.floor(diff / 7)} minggu lalu`;
  if (diff < 365) return `${Math.floor(diff / 30)} bulan lalu`;
  return `${Math.floor(diff / 365)} tahun lalu`;
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
