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

  return { id: data.id as string, isService: data.role === "service_role" };
}

async function softDeleteDevice(
  deviceId: string,
  ownerId: string | null,
  isService: boolean,
) {
  const filters = [
    `device_id=eq.${encodeURIComponent(deviceId)}`,
    "deleted_at=is.null",
  ];

  if (!isService && ownerId) {
    filters.push(`owner=eq.${encodeURIComponent(ownerId)}`);
  }

  const url = `${SUPABASE_URL}/rest/v1/android_devices?${filters.join("&")}`;
  const resp = await fetch(url, {
    method: "PATCH",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      owner: null,
      notes: null,
      mesh_username: null,
      friendly_name: null,
      deleted_at: new Date().toISOString(),
    }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`android_devices_delete_error:${resp.status}:${text}`);
  }

  const parsed = text ? JSON.parse(text) : [];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("device_not_found_or_not_owned");
  }

  return parsed;
}

async function handleRequest(req: Request) {
  try {
    if (req.method !== "DELETE") {
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

    const isServiceKey = jwt === SUPABASE_SERVICE_ROLE_KEY;
    const authUser = isServiceKey
      ? { id: null, isService: true }
      : await fetchAuthUser(jwt);

    let payload: unknown;
    try {
      payload = await req.json();
    } catch (e) {
      return jsonResponse({ error: "invalid_json", message: String(e) }, 400);
    }

    const payloadObj =
      typeof payload === "object" && payload !== null
        ? (payload as Record<string, unknown>)
        : {};
    const device_id =
      typeof payloadObj.device_id === "string" ? payloadObj.device_id : "";
    if (!device_id) {
      return jsonResponse({ error: "invalid_payload", message: "device_id is required" }, 400);
    }

    const deleted = await softDeleteDevice(
      device_id,
      authUser.id,
      authUser.isService,
    );
    return jsonResponse(deleted, 200);
  } catch (err) {
    console.error("[remove-device] error:", err);
    const message = err instanceof Error ? err.message : String(err);

    if (message.startsWith("invalid_session_token") || message === "invalid_session_payload") {
      return jsonResponse({ error: "unauthorized", message: "Invalid or expired session" }, 401);
    }

    if (message === "device_not_found_or_not_owned") {
      return jsonResponse({ error: "not_found", message: "Device not found for this owner" }, 404);
    }

    if (message.startsWith("android_devices_delete_error")) {
      return jsonResponse({ error: "bad_gateway", message }, 502);
    }

    return jsonResponse({ error: "internal_error", message }, 500);
  }
}
