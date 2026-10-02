import { NextResponse, type NextRequest } from "next/server";
import { fail, readJson, requireUser } from "@/lib/api";
import { createDebtSchema, listQuerySchema } from "@/lib/debt";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (!auth) return fail("Kamu belum login", 401);

  const q = listQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return fail("Filter tidak valid: status = all|unsettled|settled, type = all|owed_to_me|i_owe", 400);

  let query = auth.supabase.from("debts").select("*").order("created_at", { ascending: false });
  if (q.data.status === "unsettled") query = query.is("settled_at", null);
  if (q.data.status === "settled") query = query.not("settled_at", "is", null);
  if (q.data.type !== "all") query = query.eq("type", q.data.type);

  const { data, error } = await query;
  if (error) return fail("Gagal ambil data, coba lagi ya", 500);
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const auth = await requireUser();
  if (!auth) return fail("Kamu belum login", 401);

  const body = await readJson(req);
  if (body === undefined) return fail("Body harus JSON valid", 400);
  const parsed = createDebtSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  const { data, error } = await auth.supabase
    .from("debts").insert({ ...parsed.data, user_id: auth.user.id, note: parsed.data.note || null }).select().single();
  if (error) return fail("Gagal nyimpen catatan, coba lagi ya", 500);
  return NextResponse.json({ data }, { status: 201 });
}
