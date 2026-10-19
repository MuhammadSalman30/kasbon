import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, readJson, requireUser } from "@/lib/api";
import { paymentSchema } from "@/lib/debt";
import { da } from "zod/locales";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
    const auth = await requireUser();
    if (!auth) return fail("Kamu belum bisa login", 401);
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) return fail("ID tidak valdi", 400);

    const body = await readJson(req);
    if (body === undefined) return fail("Body harus JSON valdi cihuyyy",400);
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

    //RLS sembunyiin debt punya orang lain, jadi dsini juga jadi 404
    const { data: debt, error: findErr} = await auth.supabase.from("debts").select("id").eq("id", id).maybeSingle();
    if (findErr) return fail("Gagal ambil data, coba lagi kids", 500);
    if (!debt) return fail("Catatan ga ketemu", 404);

    const { amount, paid_at, note } = parsed.data;
    const { data, error } = await auth.supabase
        .from("payments")
        .insert({ debt_id: id, amount, note: note || null, ...(paid_at ? { paid_at } : {}) })
        .select("id, amount, paid_at, note")
        .single();
    // trigger di DB nolak kalo total bayar > jumlah utang (kode 23514)
    if (error) {
        if (error.code === "23514") return fail("Jumlah bayar melebihi sisa utang", 422);
        return fail("Gagal nyimpen pembayaran, coba lagi kidsss", 500);
    }
    return NextResponse.json({ data }, { status: 201 });
}