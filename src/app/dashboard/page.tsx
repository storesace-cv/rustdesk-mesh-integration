"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

import { GroupableDevice, groupDevices } from "@/lib/grouping";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Config RustDesk: sempre o domínio, nunca IP
const RUSTDESK_HOST = "rustdesk.bwb.pt";
const RUSTDESK_KEY = "Rs16v4T5zElCIsxbcAn39LwRYniVi5EQbXAgLVqWFYk=";

export default function DashboardPage() {
  const router = useRouter();
  const [jwt, setJwt] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [devices, setDevices] = useState<GroupableDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedSubgroups, setExpandedSubgroups] = useState<
    Record<string, boolean>
  >({});

  // Carrega token do localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem("rustdesk_jwt");
    if (!token) {
      router.push("/");
      return;
    }
    setJwt(token);
  }, [router]);

  // Gera QR assim que soubermos que o utilizador está autenticado
  useEffect(() => {
    if (!jwt) return;

    const config = {
      host: RUSTDESK_HOST,
      key: RUSTDESK_KEY,
    };

    const payload = JSON.stringify(config);

    QRCode.toDataURL(payload, { width: 220, margin: 1 })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.error("Erro a gerar QR:", err);
        setErrorMsg("Não foi possível gerar o QR-Code.");
      });
  }, [jwt]);

  // Carrega dispositivos a partir da Edge Function
  useEffect(() => {
    if (!jwt) return;

    async function fetchDevices() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/get-devices`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${jwt}`,
            apikey: anonKey,
          },
        });

        if (res.status === 401) {
          setErrorMsg("Sessão expirada. Faz login novamente.");
          handleLogout();
          return;
        }

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error("get-devices falhou:", data);
          setDevices([]);
          setErrorMsg("Não foi possível carregar dispositivos. Tenta novamente.");
          return;
        }

        const data = await res.json();
        if (!Array.isArray(data)) {
          console.warn("get-devices resposta inesperada:", data);
          setDevices([]);
          setErrorMsg("Sem dispositivos adoptados (ainda).");
          return;
        }

        setDevices(data as GroupableDevice[]);
        if (!data.length) {
          setErrorMsg("Sem dispositivos adoptados (ainda).");
        } else {
          setErrorMsg(null);
        }
      } catch (err: any) {
        console.error("Erro get-devices:", err);
        setErrorMsg("Erro ao carregar dispositivos.");
        setDevices([]);
      } finally {
        setLoading(false);
      }
    }

    fetchDevices();
  }, [jwt]);

  function handleLogout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("rustdesk_jwt");
    }
    router.push("/");
  }

  const grouped = groupDevices(devices);

  return (
    <main className="min-h-screen px-4 py-6 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">RustDesk Android Support</h1>
            <p className="text-sm text-slate-400">
              MeshCentral ▸ RustDesk ▸ Supabase
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-500 transition"
          >
            Sair
          </button>
        </header>

        <section className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6 mb-8 flex flex-col md:flex-row items-center gap-6">
          <div className="flex flex-col items-center">
            <h2 className="text-lg font-medium mb-3">QR-Code de Configuração</h2>
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="RustDesk QR"
                className="rounded-lg bg-white p-2"
              />
            ) : (
              <div className="w-[220px] h-[220px] rounded-lg bg-slate-800 flex items-center justify-center text-sm text-slate-400">
                A gerar QR...
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3 text-center max-w-xs">
              Ler este código na app RustDesk Android. O ID será obtido do
              servidor RustDesk e depois sincronizado para o Supabase.
            </p>
          </div>

          <div className="flex-1 w-full text-sm text-slate-300">
            <p className="mb-2">
              <span className="font-semibold">Host:</span> {RUSTDESK_HOST}
            </p>
            <p className="mb-2 break-all">
              <span className="font-semibold">Key:</span> {RUSTDESK_KEY}
            </p>
            <p className="mt-4 text-xs text-slate-400">
              Após a leitura do QR, o smartphone será registado como{" "}
              <strong>Dispositivo por Adotar</strong> até alguém preencher o{" "}
              <code>notes</code> no backoffice / Supabase.
            </p>
          </div>
        </section>

        <section className="bg-slate-900/70 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Dispositivos Android</h2>
            {loading && (
              <span className="text-xs text-slate-400">A carregar…</span>
            )}
          </div>

          {errorMsg && (
            <p className="text-sm text-amber-400 mb-3">{errorMsg}</p>
          )}

          {devices.length === 0 && !loading && (
            <p className="text-sm text-slate-400">
              {errorMsg || "Sem dispositivos adoptados (ainda)."}
            </p>
          )}

          {Object.keys(grouped).length > 0 && (
            <div className="space-y-4 mt-2">
              {Object.entries(grouped).map(([group, subgroups]) => {
                const groupKey = group || "__semgrupo__";
                const isGroupExpanded =
                  expandedGroups[groupKey] ?? group === "Dispositivos por Adotar";

                return (
                  <div
                    key={groupKey}
                    className="border border-slate-700 rounded-xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedGroups((prev) => ({
                          ...prev,
                          [groupKey]: !isGroupExpanded,
                        }))
                      }
                      className="w-full flex items-center justify-between px-4 py-2 bg-slate-800/70 hover:bg-slate-800 text-left"
                    >
                      <span className="font-medium text-sm">{group}</span>
                      <span className="text-xs text-slate-400">
                        {isGroupExpanded ? "▼" : "►"}
                      </span>
                    </button>

                    {isGroupExpanded && (
                      <div className="px-4 py-3 space-y-3">
                        {Object.entries(subgroups).map(
                          ([sub, devsInSubgroup]) => {
                            const subKey = `${groupKey}::${sub || "__nosub__"}`;
                            const isSubExpanded =
                              expandedSubgroups[subKey] ?? true;

                            return (
                              <div key={subKey} className="space-y-2">
                                {sub && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedSubgroups((prev) => ({
                                        ...prev,
                                        [subKey]: !isSubExpanded,
                                      }))
                                    }
                                    className="flex items-center justify-between w-full text-xs text-slate-300"
                                  >
                                    <span className="italic">{sub}</span>
                                    <span className="text-slate-500">
                                      {isSubExpanded ? "▼" : "►"}
                                    </span>
                                  </button>
                                )}

                                {(isSubExpanded || !sub) && (
                                  <div className="grid gap-3 md:grid-cols-2">
                                    {devsInSubgroup.map((d) => (
                                      <div
                                        key={d.id}
                                        className="border border-slate-700 rounded-lg px-3 py-2 bg-slate-950/50 text-xs"
                                      >
                                        <div className="flex justify-between mb-1">
                                          <span className="font-semibold">
                                            {d.device_id}
                                          </span>
                                          <span className="text-slate-500">
                                            owner: {d.owner}
                                          </span>
                                        </div>
                                        {d.notes && (
                                          <p className="text-slate-400">
                                            {d.notes}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
