// Make this function public (no platform-level JWT required)
export const config = { verify_jwt: false };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req: Request) {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    let payload: any;
    try {
      payload = await req.json();
    } catch (e) {
      console.error("[login] invalid json body:", String(e));
      return jsonResponse({ error: "invalid_json", message: String(e) }, 400);
    }

    const email = payload?.email;
    const password = payload?.password;
    if (!email || !password) {
      return jsonResponse({ error: "missing_fields", message: "Email and password required" }, 400);
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const missing = [] as string[];
      if (!SUPABASE_URL) missing.push("SUPABASE_URL");
      if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");

      return jsonResponse(
        {
          error: "config_error",
          message: `Missing env: ${missing.join(", ")}`,
        },
        500,
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
      return jsonResponse(
        {
          error: json?.error || "invalid_login",
          message: errorMessage || "Invalid login credentials",
        },
        tokenResp.status,
      );
    }

    const accessToken = json?.access_token;
    if (!accessToken) {
      return jsonResponse(
        {
          error: "login_failed",
          message: "Token endpoint did not return access_token",
        },
        502,
      );
    }

    return jsonResponse({ token: accessToken }, 200);
  } catch (err) {
    console.error("[login] handler error:", err);
    return jsonResponse({ error: "internal_error", message: String(err) }, 500);
  }
}
