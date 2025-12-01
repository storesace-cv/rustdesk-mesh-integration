"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("rustdesk_token");
    if (!stored) {
      router.replace("/");
      return;
    }
    setToken(stored);
  }, [router]);

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("rustdesk_token");
    }
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl shadow-black/40 p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              Dashboard (placeholder simples)
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Login OK. Depois voltamos a pôr o QR e os dispositivos.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-full border border-red-500/70 text-red-200 px-4 py-1.5 text-xs font-medium hover:bg-red-500/10 transition-colors"
          >
            Terminar sessão
          </button>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-950/80 border border-slate-800 px-4 py-3">
          <p className="text-xs font-mono text-slate-400 break-all">
            Token: {token || "(a carregar...)"}
          </p>
        </div>
      </div>
    </div>
  );
}
