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
    return { isService: true };
  }

  return { userId: data.id, isService: false };
}

async function fetchMeshUserById(userId: string) {
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

  return rows[0] as { id: string; mesh_username?: string };
}

async function fetchMeshUserByUsername(meshUsername: string) {
  const url = `${SUPABASE_URL}/rest/v1/mesh_users?mesh_username=eq.${encodeURIComponent(meshUsername)}`;
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

  return rows[0] as { id: string; mesh_username?: string };
}

async function fetchExistingDevice(deviceId: string) {
  const url = `${SUPABASE_URL}/rest/v1/android_devices?device_id=eq.${encodeURIComponent(deviceId)}`;
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

  const rows = await resp.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function upsertDevice(body: Record<string, unknown>) {
  const url = `${SUPABASE_URL}/rest/v1/android_devices?on_conflict=device_id`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`android_devices_upsert_error:${resp.status}:${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function handleRequest(req: Request) {
  try {
    if (req.method !== "POST") {
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

    const authInfo = await fetchAuthUser(jwt);

    let payload: any;
    try {
      payload = await req.json();
    } catch (e) {
      return jsonResponse({ error: "invalid_json", message: String(e) }, 400);
    }

    const { device_id, mesh_username, friendly_name, notes, last_seen } = payload ?? {};
    if (!device_id) {
      return jsonResponse({ error: "invalid_payload", message: "device_id is required" }, 400);
    }

    let ownerId: string;
    let resolvedMeshUsername: string | undefined = mesh_username;

    if (authInfo.isService) {
      if (!mesh_username) {
        return jsonResponse({ error: "invalid_payload", message: "mesh_username is required for service role" }, 400);
      }
      const meshUser = await fetchMeshUserByUsername(mesh_username);
      ownerId = meshUser.id;
      resolvedMeshUsername = meshUser.mesh_username ?? mesh_username;
    } else if (authInfo.userId) {
      const meshUser = await fetchMeshUserById(authInfo.userId);
      ownerId = meshUser.id;
      resolvedMeshUsername = meshUser.mesh_username ?? mesh_username;
    } else {
      return jsonResponse({ error: "unauthorized", message: "Invalid authentication context" }, 401);
    }

    const existing = await fetchExistingDevice(device_id);
    const payloadNotes = notes !== undefined ? notes : existing?.notes ?? null;
    const payloadFriendlyName = friendly_name ?? existing?.friendly_name ?? null;

    const upsertPayload = {
      device_id,
      owner: ownerId,
      mesh_username: resolvedMeshUsername,
      friendly_name: payloadFriendlyName,
      notes: payloadNotes,
      last_seen_at: last_seen ?? new Date().toISOString(),
      deleted_at: null,
    };

    const result = await upsertDevice(upsertPayload);
    return jsonResponse(result ?? { success: true }, 200);
  } catch (err) {
    console.error("[register-device] error:", err);
    const message = err instanceof Error ? err.message : String(err);

    if (message.startsWith("invalid_session_token") || message === "invalid_session_payload") {
      return jsonResponse({ error: "unauthorized", message: "Invalid or expired session" }, 401);
    }

    if (message === "mesh_user_not_found") {
      return jsonResponse({ error: "not_found", message: "Mesh user not found" }, 404);
    }

    if (message.startsWith("android_devices_upsert_error") || message.startsWith("android_devices_fetch_error")) {
      return jsonResponse({ error: "bad_gateway", message }, 502);
    }

    return jsonResponse({ error: "internal_error", message }, 500);
  }
}
