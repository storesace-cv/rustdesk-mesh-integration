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
import { ProxyAgent } from "undici";

export const runtime = "nodejs";

interface LoginRequestBody {
  email?: string;
  password?: string;
}

function shouldBypassProxy(hostname: string) {
  const entries =
    process.env.NO_PROXY?.split(",") || process.env.no_proxy?.split(",") || [];
  return entries
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => {
      if (entry === "*") return true;
      if (entry === hostname) return true;
      if (entry.startsWith(".")) return hostname.endsWith(entry);
      return false;
    });
}

function createProxyAgent(targetUrl: string): {
  proxyAgent?: ProxyAgent;
  usingProxy: boolean;
} {
  const proxyUrl =
    process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;

  if (!proxyUrl) return { proxyAgent: undefined, usingProxy: false };

  let target: URL;
  try {
    target = new URL(targetUrl);
  } catch (error) {
    logWarn("login", "Invalid target URL when configuring proxy", {
      targetUrl,
      error: safeError(error),
    });
    return { proxyAgent: undefined, usingProxy: false };
  }

  if (shouldBypassProxy(target.hostname)) {
    return { proxyAgent: undefined, usingProxy: false };
  }

  try {
    return { proxyAgent: new ProxyAgent(proxyUrl), usingProxy: true };
  } catch (error) {
    logWarn("login", "Failed to configure proxy for Supabase call", {
      proxyUrl,
      error: safeError(error),
    });
    return { proxyAgent: undefined, usingProxy: false };
  }
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
  const { proxyAgent, usingProxy } = createProxyAgent(targetUrl);
  logDebug("login", "Calling Supabase login function", {
    requestId,
    targetUrl,
    emailMasked: maskEmail(email),
    usingProxy,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ email, password }),
      dispatcher: proxyAgent,
      signal: controller.signal,
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
    if (error instanceof DOMException && error.name === "AbortError") {
      logWarn("login", "Supabase login timed out", { requestId, clientIp });
      return NextResponse.json(
        { message: "Tempo limite ao contactar o serviço de login." },
        { status: 504 },
      );
    }

    logError("login", "Unhandled error during login", {
      requestId,
      clientIp,
      error: safeError(error),
    });
    return NextResponse.json({ message: "Erro interno ao processar login." }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}
