export const config = { verify_jwt: true };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

function extractBearer(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/Bearer\s+(.+)/i);
  return m ? m[1] : null;
}

async function handleRequest(req: Request) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
    }

    const jwt = extractBearer(req);
    if (!jwt) {
      return new Response(JSON.stringify({ code: 401, message: "Missing Bearer JWT" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "invalid_json", message: String(e) }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { device_id, owner, notes } = payload ?? {};
    if (!device_id || !owner) {
      return new Response(JSON.stringify({ code: 400, message: "device_id and owner required" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const url = `${SUPABASE_URL}/rest/v1/android_devices`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ device_id, owner, notes: notes ?? null }),
    });

    const body = await resp.text();
    return new Response(body, { status: resp.status, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[register-device] error:", err);
    return new Response(JSON.stringify({ code: 500, message: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
