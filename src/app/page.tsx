"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("suporte@bwb.pt");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Se já houver token em localStorage, vai directo para o dashboard
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = window.localStorage.getItem("rustdesk_jwt");
    if (existing) {
      router.push("/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!email || !password) {
        setError("Email e password são obrigatórios.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(
          data.message ||
            (res.status === 401
              ? "Credenciais inválidas ou utilizador não existe."
              : "Falha no login"),
        );
        setLoading(false);
        return;
      }

      if (!data.token) {
        setError("Resposta sem token.");
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.setItem("rustdesk_jwt", data.token);
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : "Não foi possível comunicar com o servidor. Tenta novamente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900/70 border border-slate-700 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          RustDesk Android Support
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              className="w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-2 text-sm font-medium transition"
          >
            {loading ? "A entrar..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
