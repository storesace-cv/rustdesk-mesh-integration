export const config = { verify_jwt: true };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
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
    if (req.method !== "GET") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      const missing = [] as string[];
      if (!SUPABASE_URL) missing.push("SUPABASE_URL");
      if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
      return jsonResponse({ error: "config_error", message: `Missing env: ${missing.join(", ")}` }, 500);
    }

    const jwt = extractBearer(req);
    if (!jwt) {
      return jsonResponse({ error: "unauthorized", message: "Missing Bearer JWT" }, 401);
    }

    const authUser = await fetchAuthUser(jwt);
    const meshUser = await fetchMeshUser(authUser.id);
    const devices = await fetchDevices(meshUser.id);

    return jsonResponse(devices, 200);
  } catch (err) {
    console.error("[get-devices] error:", err);
    const message = err instanceof Error ? err.message : String(err);

    if (message.startsWith("invalid_session_token") || message === "invalid_session_payload") {
      return jsonResponse({ error: "unauthorized", message: "Invalid or expired session" }, 401);
    }

    if (message === "service_role_not_allowed") {
      return jsonResponse({ error: "forbidden", message: "Service role not allowed" }, 403);
    }

    if (message === "mesh_user_not_found") {
      return jsonResponse({ error: "not_found", message: "Mesh user not found" }, 404);
    }

    return jsonResponse({ error: "internal_error", message }, 500);
  }
}
