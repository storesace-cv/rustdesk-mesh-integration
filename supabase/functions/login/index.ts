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
    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(
        JSON.stringify({ code: 400, message: "Email e password obrigatórios." }),
        { status: 400, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return new Response(
        JSON.stringify({ code: 401, message: error?.message ?? "Credenciais inválidas." }),
        { status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ token: data.session.access_token }), {
      status: 200,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("login error:", err);
    return new Response(
      JSON.stringify({ code: 500, message: "Erro interno na função login." }),
      { status: 500, headers: corsHeaders(new Request("/")) },
    );
  }
});
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return new Response(
        JSON.stringify({ code: 400, message: "Email e password obrigatórios." }),
        { status: 400 },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return new Response(
        JSON.stringify({ code: 401, message: error?.message ?? "Credenciais inválidas." }),
        { status: 401 },
      );
    }

    return new Response(JSON.stringify({ token: data.session.access_token }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("login error:", err);
    return new Response(
      JSON.stringify({ code: 500, message: "Erro interno na função login." }),
      { status: 500 },
    );
  }
});
