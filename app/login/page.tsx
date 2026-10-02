"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, NotebookPen } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "err" | "ok"; text: string } | null>(null);

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault();
    setMsg(null);
    if (password.length < 6) return setMsg({ kind: "err", text: "Password minimal 6 karakter" });
    setBusy(true);
    const supabase = createClient();
    const { data, error } = mode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg({ kind: "err", text: mode === "login" ? "Email atau password salah" : "Gagal daftar: " + error.message });
    if (!data.session) return setMsg({ kind: "ok", text: "Cek email kamu buat konfirmasi, abis itu login ya." });
    router.replace("/");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <div className="mb-8 flex items-center gap-2 text-2xl font-extrabold"><NotebookPen className="text-pos" /> Kasbon</div>
      <h1 className="text-xl font-bold">{mode === "login" ? "Masuk dulu yuk" : "Bikin akun baru"}</h1>
      <p className="mb-6 mt-1 text-sm text-ink/60">Catat utang piutang tanpa ribet, gak perlu lagi inget-inget.</p>
      <form onSubmit={submit} className="space-y-3">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
          className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 outline-none focus:border-pos focus:ring-2 focus:ring-pos/20" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min. 6 karakter)"
          className="w-full rounded-xl border border-ink/15 bg-white px-4 py-3 outline-none focus:border-pos focus:ring-2 focus:ring-pos/20" />
        {msg && <p role="alert" className={`text-sm ${msg.kind === "err" ? "text-neg" : "text-pos"}`}>{msg.text}</p>}
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 font-semibold text-white active:scale-[.98] disabled:opacity-60">
          {busy && <Loader2 className="size-4 animate-spin" />}{mode === "login" ? "Masuk" : "Daftar"}
        </button>
      </form>
      <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMsg(null); }} className="mt-5 text-sm text-ink/60 underline">
        {mode === "login" ? "Belum punya akun? Daftar" : "Udah punya akun? Masuk"}
      </button>
    </main>
  );
}
