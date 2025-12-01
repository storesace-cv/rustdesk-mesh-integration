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
