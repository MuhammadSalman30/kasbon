"use client";
import { useEffect, useState } from "react";
import { Check, Loader2, NotebookPen } from "lucide-react";

export type AuthPhase = "checking" | "success";

const COPY: Record<AuthPhase, { title: string; hint: string }> = {
    checking : { title: "Memeriksa akun...", hint:"Bentar yee, lagi nyocokin email sama password." },
    success : { title: "Anjay masuk", hint: "Nyiapin catetan lu nih..." },
};

// Layar full yang nutup halaman login dari klik "Masuk" sampai dashboard kebuka.
// Hilang sendiri karena halaman login ikut ke-unmount saat navigasi selesai.
export default function AuthOverlay({ phase }: { phase: AuthPhase}) {
    const [slow, setSlow] = useState(false);

    useEffect(() => {
        if (phase !== "success") return;
        const t = setTimeout(() => setSlow(true), 12000);
        return () => clearTimeout(t);
    }, [phase]);

    const { title, hint } = COPY[phase];

    return (
        <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink px-6 text-center text-white">
            <div className="flex items-center gap-2 text-2xl font-extrabold"><NotebookPen className="text-emerald-300" /> Kasbon</div>

            <div className={`flex size-16 items-center justify-center rounded-full transition-colors duration-300 ${phase === "success" ? "bg-emerald-400 text-ink" : "bg-white/10 text-white"}`}>
                {phase === "success" ? <Check className="size-8" strokeWidth={3} /> : <Loader2 className="size-8 animate-spin motion-reduce:animate-none" />}
            </div>

            <div>
                <p className="text-lg font-bold">{title}</p>
                <p className="mt-1 text-sm text-white/60">{slow ? "Masi agak lama. Kalo ora masuk2, refresh ae." : hint}</p>
                {slow && (
                    <button onClick={() => window.location.assign("/")} className="mt-4 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20">Muat Ulang</button>
                )}
            </div>
        </div>
    );
}