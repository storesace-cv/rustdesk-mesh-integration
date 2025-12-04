// Make this function public (no platform-level JWT required)
export const config = { verify_jwt: false };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req: Request) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "method_not_allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    let payload;
    try {
      payload = await req.json();
    } catch (e) {
      console.error("[login] invalid json body:", String(e));
      return new Response(JSON.stringify({ error: "invalid_json", message: String(e) }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const email = payload?.email;
    const password = payload?.password;
    if (!email || !password) {
      return new Response(JSON.stringify({ error: "missing_fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = new URLSearchParams({
      grant_type: "password",
      username: email,
      password: password,
    }).toString();

    const tokenResp = await fetch(`${SUPABASE_URL}/auth/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: SUPABASE_ANON_KEY,
      },
      body,
    });

    const text = await tokenResp.text();

    // Debug output — visible in Invocation logs while diagnosing
    console.error("[login] token endpoint status:", tokenResp.status);
    console.error("[login] token endpoint body:", text);

    return new Response(text, {
      status: tokenResp.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[login] handler error:", err);
    return new Response(JSON.stringify({ error: "internal_error", message: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
