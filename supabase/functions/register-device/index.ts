import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { device_id, owner, notes } = body ?? {};

    if (!device_id || !owner) {
      return new Response(
        JSON.stringify({ code: 400, message: "device_id e owner obrigatórios." }),
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("android_devices")
      .upsert(
        { device_id, owner, notes: notes ?? null },
        { onConflict: "device_id,owner" },
      )
      .select("*");

    if (error) {
      console.error("register-device error:", error);
      return new Response(
        JSON.stringify({ code: 500, message: "Erro a registar dispositivo." }),
        { status: 500 },
      );
    }

    return new Response(JSON.stringify(data ?? []), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("register-device error:", err);
    return new Response(
      JSON.stringify({ code: 500, message: "Erro interno na função register-device." }),
      { status: 500 },
    );
  }
});
