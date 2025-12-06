import { NextResponse } from "next/server";

import {
  correlationId,
  initializeDebugLogger,
  logDebug,
  logError,
  logInfo,
  logWarn,
  maskEmail,
  safeError,
} from "@/lib/debugLogger";

export const runtime = "nodejs";

interface LoginRequestBody {
  email?: string;
  password?: string;
}

export async function POST(req: Request) {
  initializeDebugLogger();
  const start = performance.now();
  const requestId = correlationId("login");
  const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

  let body: LoginRequestBody;
  try {
    body = await req.json();
  } catch (error) {
    logWarn("login", "Invalid JSON body received", {
      requestId,
      clientIp,
      error: safeError(error),
    });
    return NextResponse.json({ message: "Pedido inválido" }, { status: 400 });
  }

  const email = body.email?.toString().trim();
  const password = body.password?.toString() ?? "";

  logInfo("login", "Login request received", {
    requestId,
    clientIp,
    hasEmail: Boolean(email),
    emailMasked: maskEmail(email),
    payloadFields: Object.keys(body || {}),
  });

  if (!email || !password) {
    logWarn("login", "Missing credentials", {
      requestId,
      clientIp,
      emailMasked: maskEmail(email),
    });
    return NextResponse.json({ message: "Email e password são obrigatórios." }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    logError("login", "Supabase configuration missing", {
      requestId,
      supabaseUrlPresent: Boolean(supabaseUrl),
      anonKeyPresent: Boolean(anonKey),
    });
    return NextResponse.json({ message: "Configuração Supabase em falta." }, { status: 500 });
  }

  const targetUrl = `${supabaseUrl}/functions/v1/login`;
  logDebug("login", "Calling Supabase login function", {
    requestId,
    targetUrl,
    emailMasked: maskEmail(email),
  });

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ email, password }),
    });

    const responseBody = await response.json().catch(() => ({}));

    logInfo("login", "Supabase login responded", {
      requestId,
      status: response.status,
      ok: response.ok,
      hasToken: Boolean((responseBody as { token?: string }).token),
    });

    if (!response.ok) {
      logWarn("login", "Supabase login returned an error", {
        requestId,
        status: response.status,
        reason: (responseBody as { message?: string }).message || response.statusText,
      });
      return NextResponse.json(
        { message: (responseBody as { message?: string }).message || "Falha no login" },
        { status: response.status },
      );
    }

    const token = (responseBody as { token?: string }).token;
    if (!token) {
      logWarn("login", "Login succeeded without token in response", { requestId });
      return NextResponse.json({ message: "Resposta sem token." }, { status: 502 });
    }

    const durationMs = Math.round(performance.now() - start);
    logDebug("login", "Login request completed", { requestId, durationMs });
    return NextResponse.json({ token });
  } catch (error) {
    logError("login", "Unhandled error during login", {
      requestId,
      clientIp,
      error: safeError(error),
    });
    return NextResponse.json({ message: "Erro interno ao processar login." }, { status: 500 });
  }
}
