export const config = { verify_jwt: true };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const DEFAULT_CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "authorization,content-type,apikey",
  "Access-Control-Max-Age": "86400",
};

const FORBIDDEN_CORS_HEADERS = {
  ...DEFAULT_CORS_HEADERS,
  "Access-Control-Allow-Origin": "false",
};

function buildCorsHeaders(req: Request) {
  const origin = req.headers.get("origin");
  if (ALLOWED_ORIGINS.length > 0 && (!origin || !ALLOWED_ORIGINS.includes(origin))) {
    return null;
  }

  return { ...DEFAULT_CORS_HEADERS, "Access-Control-Allow-Origin": origin || "*" } as const;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  req?: Request,
  corsHeaders?: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(req ? corsHeaders || buildCorsHeaders(req) || {} : {}),
    },
  });
}

function extractBearer(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/Bearer\s+(.+)/i);
  return m ? m[1] : null;
}

addEventListener("fetch", (event) => {
  event.respondWith(handleRequest(event.request));
});

async function fetchAuthUser(jwt: string) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`invalid_session_token:${resp.status}:${text}`);
  }

  const data = await resp.json();
  if (!data?.id) {
    throw new Error("invalid_session_payload");
  }

  if (data?.role === "service_role") {
    throw new Error("service_role_not_allowed");
  }

  return data as { id: string };
}

async function fetchMeshUser(userId: string) {
  const url = `${SUPABASE_URL}/rest/v1/mesh_users?id=eq.${encodeURIComponent(userId)}`;
  const resp = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`mesh_users_fetch_error:${resp.status}:${text}`);
  }

  const rows = await resp.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("mesh_user_not_found");
  }

  return rows[0] as { id: string };
}

async function fetchDevices(ownerId: string) {
  const url = `${SUPABASE_URL}/rest/v1/android_devices_grouping?owner=eq.${encodeURIComponent(ownerId)}&deleted_at=is.null`;
  const resp = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`android_devices_fetch_error:${resp.status}:${text}`);
  }

  return await resp.json();
}

async function handleRequest(req: Request) {
  try {
    const corsHeaders = buildCorsHeaders(req);
    if (!corsHeaders) {
      return new Response(null, { status: 403, headers: FORBIDDEN_CORS_HEADERS });
    }

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!["GET", "POST"].includes(req.method)) {
      return jsonResponse({ error: "method_not_allowed" }, 405, req, corsHeaders);
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const missing = [] as string[];
      if (!SUPABASE_URL) missing.push("SUPABASE_URL");
      if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
      return jsonResponse({ error: "config_error", message: `Missing env: ${missing.join(", ")}` }, 500, req, corsHeaders);
    }

    const jwt = extractBearer(req);
    if (!jwt) {
      return jsonResponse({ error: "unauthorized", message: "Missing Bearer JWT" }, 401, req, corsHeaders);
    }

    const authUser = await fetchAuthUser(jwt);
    const meshUser = await fetchMeshUser(authUser.id);
    const devices = await fetchDevices(meshUser.id);

    return jsonResponse(devices, 200, req, corsHeaders);
  } catch (err) {
    console.error("[get-devices] error:", err);
    const message = err instanceof Error ? err.message : String(err);

    if (message.startsWith("invalid_session_token") || message === "invalid_session_payload") {
      return jsonResponse({ error: "unauthorized", message: "Invalid or expired session" }, 401, req, corsHeaders);
    }

    if (message === "service_role_not_allowed") {
      return jsonResponse({ error: "forbidden", message: "Service role not allowed" }, 403, req, corsHeaders);
    }

    if (message === "mesh_user_not_found") {
      return jsonResponse({ error: "not_found", message: "Mesh user not found" }, 404, req, corsHeaders);
    }

    return jsonResponse({ error: "internal_error", message }, 500, req, corsHeaders);
  }
}
