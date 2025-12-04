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
    if (req.method !== "GET") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: { "Content-Type": "application/json" } });
    }

    const jwt = extractBearer(req);
    if (!jwt) {
      return new Response(JSON.stringify({ code: 401, message: "Missing Bearer JWT" }), { status: 401, headers: { "Content-Type": "application/json" } });
    }

    // Forward query string and path to PostgREST
    // Build URL for PostgREST endpoint (android_devices table)
    const url = new URL(`${SUPABASE_URL}/rest/v1/android_devices`);
    // propagate query params from incoming request
    const incomingUrl = new URL(req.url);
    incomingUrl.searchParams.forEach((v, k) => url.searchParams.append(k, v));

    const resp = await fetch(url.toString(), {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jwt}`,
        Accept: "application/json",
      },
    });

    const body = await resp.text();
    return new Response(body, { status: resp.status, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[get-devices] error:", err);
    return new Response(JSON.stringify({ code: 500, message: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
