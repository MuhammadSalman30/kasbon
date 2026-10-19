import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, requireUser } from "@/lib/api";

type Ctx = { params: Promise<{ id: string; paymentId: string }> };
const isUuid = (v: string) => z.uuid().safeParse(v).success;

export async function DELETE(_req: Request, { params }: Ctx) {
    const auth = await requireUser();
    if (!auth) return fail("Kamu belum login", 401);
    const { id, paymentId } = await params;
    if (!isUuid(id) || !isUuid(paymentId)) return fail("ID tidak valdi bosss", 400);

    const { data, error } = await auth.supabase
        .from("payments").delete().eq("id", paymentId).eq("debt_id", id).select("id");
    if (error) return fail("Gagal hapus pembayaran, coba lagi yeh kids", 500);
    if (!data.length) return fail("Pembayaran gak ketemu", 404);
    return NextResponse.json({ data: { id: paymentId } });
}