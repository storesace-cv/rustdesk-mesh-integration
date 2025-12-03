import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  const allowed = Deno.env.get("SUPABASE_CORS_ALLOWED_ORIGIN") || origin;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function authUserEndpoint(base: string) {
  return base.replace(/\/$/, "") + "/auth/v1/user";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(
        JSON.stringify({ code: 401, message: "Missing Authorization header." }),
        { status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");

    // Validate token by calling Supabase Auth user endpoint.
    const userResp = await fetch(authUserEndpoint(supabaseUrl), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    if (!userResp.ok) {
      const body = await userResp.text();
      console.warn("auth validation failed", userResp.status, body);
      return new Response(
        JSON.stringify({ code: 401, message: "Invalid or expired token." }),
        { status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const authUser = await userResp.json();

    // Lookup mesh_users linked to this auth user (if present) and the user's devices.
    const client = createClient(supabaseUrl, serviceRoleKey);

    const meshPromise = client
      .from("mesh_users")
      .select("*")
      .eq("id", authUser?.id)
      .maybeSingle();

    const devicesPromise = client
      .from("android_devices_expanded")
      .select("*")
      .eq("owner", authUser?.id);

    const [meshRes, devicesRes] = await Promise.all([meshPromise, devicesPromise]);

    if (meshRes.error) console.error("mesh_users lookup error:", meshRes.error);
    if (devicesRes.error) console.error("devices lookup error:", devicesRes.error);

    const meshUser = meshRes.data ?? null;
    const devices = devicesRes.data ?? [];

    return new Response(
      JSON.stringify({ ok: true, user: authUser, mesh_user: meshUser, devices }),
      { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("auth function error:", err);
    return new Response(
      JSON.stringify({ code: 500, message: "Internal error in auth function." }),
      { status: 500, headers: { ...corsHeaders(new Request("/")), "Content-Type": "application/json" } },
    );
  }
});
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function authUserEndpoint(base: string) {
  return base.replace(/\/$/, "") + "/auth/v1/user";
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return new Response(
        JSON.stringify({ code: 401, message: "Missing Authorization header." }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");

    // Validate token by calling Supabase Auth user endpoint.
    const userResp = await fetch(authUserEndpoint(supabaseUrl), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    if (!userResp.ok) {
      const body = await userResp.text();
      console.warn("auth validation failed", userResp.status, body);
      return new Response(
        JSON.stringify({ code: 401, message: "Invalid or expired token." }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const authUser = await userResp.json();

    // Lookup mesh_users linked to this auth user (if present) and the user's devices.
    const client = createClient(supabaseUrl, serviceRoleKey);

    const meshPromise = client
      .from("mesh_users")
      .select("*")
      .eq("id", authUser?.id)
      .maybeSingle();

    const devicesPromise = client
      .from("android_devices_expanded")
      .select("*")
      .eq("owner", authUser?.id);

    const [meshRes, devicesRes] = await Promise.all([meshPromise, devicesPromise]);

    if (meshRes.error) console.error("mesh_users lookup error:", meshRes.error);
    if (devicesRes.error) console.error("devices lookup error:", devicesRes.error);

    const meshUser = meshRes.data ?? null;
    const devices = devicesRes.data ?? [];

    return new Response(
      JSON.stringify({ ok: true, user: authUser, mesh_user: meshUser, devices }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("auth function error:", err);
    return new Response(
      JSON.stringify({ code: 500, message: "Internal error in auth function." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

