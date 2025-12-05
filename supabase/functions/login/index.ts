// Make this function public (no platform-level JWT required)
export const config = { verify_jwt: false };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const missing = [] as string[];
      if (!SUPABASE_URL) missing.push("SUPABASE_URL");
      if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");

      return new Response(
        JSON.stringify({
          error: "config_error",
          message: `Missing env: ${missing.join(", ")}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const body = new URLSearchParams({
      grant_type: "password",
      username: email,
      password: password,
    }).toString();

    const tokenResp = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body,
      },
    );

    const text = await tokenResp.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.error("[login] failed to parse token response", err);
    }

    if (!tokenResp.ok) {
      const errorMessage = json?.error_description || json?.msg || text;
      return new Response(
        JSON.stringify({
          error: json?.error || "invalid_login",
          message: errorMessage || "Invalid login credentials",
        }),
        {
          status: tokenResp.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const accessToken = json?.access_token;
    if (!accessToken) {
      return new Response(
        JSON.stringify({
          error: "login_failed",
          message: "Token endpoint did not return access_token",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ token: accessToken }), {
      status: 200,
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
