import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, readJson, requireUser } from "@/lib/api";
import { updateDebtSchema } from "@/lib/debt";

type Ctx = { params: Promise<{ id: string }> };
const isUuid = (v: string) => z.uuid().safeParse(v).success;

export async function PATCH(req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (!auth) return fail("Kamu belum login", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("ID tidak valid", 400);

  const body = await readJson(req);
  if (body === undefined) return fail("Body harus JSON valid", 400);
  const parsed = updateDebtSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);
  const { settled, ...fields } = parsed.data;
  if (Object.keys(fields).length === 0 && settled === undefined) return fail("Gak ada yang diubah", 422);

  const { data: current, error: findErr } = await auth.supabase.from("debts").select("settled_at").eq("id", id).maybeSingle();
  if (findErr) return fail("Gagal ambil data, coba lagi ya", 500);
  if (!current) return fail("Catatan gak ketemu", 404);

  const patch: Record<string, unknown> = { ...fields };
  if ("note" in fields) patch.note = fields.note || null;
  // idempotent: tandai lunas 2x gak ngubah settled_at pertama
  if (settled === true && !current.settled_at) patch.settled_at = new Date().toISOString();
  if (settled === false) patch.settled_at = null;

  if (Object.keys(patch).length === 0) {
    const { data } = await auth.supabase.from("debts").select().eq("id", id).single();
    return NextResponse.json({ data });
  }
  const { data, error } = await auth.supabase.from("debts").update(patch).eq("id", id).select().single();
  if (error) return fail("Gagal update catatan, coba lagi ya", 500);
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const auth = await requireUser();
  if (!auth) return fail("Kamu belum login", 401);
  const { id } = await params;
  if (!isUuid(id)) return fail("ID tidak valid", 400);

  const { data, error } = await auth.supabase.from("debts").delete().eq("id", id).select("id");
  if (error) return fail("Gagal hapus catatan, coba lagi ya", 500);
  if (!data.length) return fail("Catatan gak ketemu", 404);
  return NextResponse.json({ data: { id } });
}
