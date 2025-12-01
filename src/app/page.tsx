"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("suporte@bwb.pt");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Se já tiver token, salta logo para o dashboard
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = window.localStorage.getItem("rustdesk_token");
    if (existing) {
      router.push("/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!supabaseUrl || !anonKey) {
        throw new Error("Variáveis NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY em falta.");
      }

      const res = await fetch(supabaseUrl + "/functions/v1/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + anonKey,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        let message = "Erro ao autenticar.";
        try {
          const body = await res.json();
          if (body && typeof body.message === "string") {
            message = body.message;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const data = await res.json();
      const token = (data && (data.token as string | undefined)) || null;
      if (!token) {
        throw new Error("Resposta do servidor sem token.");
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("rustdesk_token", token);
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Erro inesperado ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl shadow-black/40 p-8">
        <h1 className="text-center text-xl font-semibold text-slate-50">
          RustDesk · Android Support <span className="text-xs text-slate-400">(v2)</span>
        </h1>
        <p className="mt-2 text-center text-sm text-slate-400">
          Autentica-te com o teu utilizador Supabase para ver o QR e os dispositivos Android.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-600 bg-red-950/70 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold text-slate-900 py-2 transition-colors"
          >
            {loading ? "A autenticar..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
