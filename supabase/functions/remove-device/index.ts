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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  try {
    const { device_id, owner } = await req.json();
    if (!device_id || !owner) {
      return new Response(
        JSON.stringify({ code: 400, message: "device_id e owner obrigatórios." }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from("android_devices")
      .delete()
      .eq("device_id", device_id)
      .eq("owner", owner);

    if (error) {
      console.error("remove-device error:", error);
      return new Response(
        JSON.stringify({ code: 500, message: "Erro a remover dispositivo." }),
        { status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("remove-device error:", err);
    return new Response(
      JSON.stringify({ code: 500, message: "Erro interno na função remove-device." }),
      { status: 500, headers: corsHeaders(new Request("/")) },
    );
  }
});
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const { device_id, owner } = await req.json();
    if (!device_id || !owner) {
      return new Response(
        JSON.stringify({ code: 400, message: "device_id e owner obrigatórios." }),
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from("android_devices")
      .delete()
      .eq("device_id", device_id)
      .eq("owner", owner);

    if (error) {
      console.error("remove-device error:", error);
      return new Response(
        JSON.stringify({ code: 500, message: "Erro a remover dispositivo." }),
        { status: 500 },
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("remove-device error:", err);
    return new Response(
      JSON.stringify({ code: 500, message: "Erro interno na função remove-device." }),
      { status: 500 },
    );
  }
});
