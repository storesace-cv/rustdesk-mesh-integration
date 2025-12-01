import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function getTokenFromAuthHeader(req: Request): string | null {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth) return null;
  const parts = auth.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") return parts[1];
  return null;
}

Deno.serve(async (req) => {
  try {
    const jwt = getTokenFromAuthHeader(req);
    if (!jwt) {
      return new Response(
        JSON.stringify({ code: 401, message: "Missing Bearer JWT" }),
        { status: 401 },
      );
    }

    // Validar o JWT utilizando o próprio Supabase
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ code: 401, message: "JWT inválido ou sessão expirada." }),
        { status: 401 },
      );
    }

    // Mapear user.id -> mesh_users
    const { data: meshUser, error: meshErr } = await supabase
      .from("mesh_users")
      .select("*")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (meshErr || !meshUser) {
      return new Response(
        JSON.stringify({ code: 404, message: "Utilizador Mesh não encontrado." }),
        { status: 404 },
      );
    }

    const { data: devices, error: devErr } = await supabase
      .from("android_devices")
      .select("*")
      .eq("owner", meshUser.mesh_username)
      .order("created_at", { ascending: true });

    if (devErr) {
      console.error("get-devices error:", devErr);
      return new Response(
        JSON.stringify({ code: 500, message: "Erro a carregar dispositivos." }),
        { status: 500 },
      );
    }

    return new Response(JSON.stringify(devices ?? []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("get-devices error:", err);
    return new Response(
      JSON.stringify({ code: 500, message: "Erro interno na função get-devices." }),
      { status: 500 },
    );
  }
});
