import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

export async function readJson(req: Request): Promise<unknown | undefined> {
  try { return await req.json(); } catch { return undefined; }
}
