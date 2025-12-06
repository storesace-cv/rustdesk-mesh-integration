import fs from "fs";
import os from "os";
import path from "path";

import { initializeDebugLogger, logDebug, logError, logInfo, loggerState, maskedValue, safeError } from "@/lib/debugLogger";

export async function register() {
  const state = initializeDebugLogger();
  const startTime = new Date();
  logInfo("startup", "Application bootstrap starting", {
    timestamp: startTime.toISOString(),
  });

  const packageVersion = readPackageVersion();
  logInfo("startup", "Runtime and app metadata", {
    nodeVersion: process.version,
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
    appVersion: packageVersion,
    gitCommit: process.env.GIT_COMMIT || process.env.VERCEL_GIT_COMMIT_SHA || "unknown",
    debugEnabled: state.enabled,
    logPath: state.logPath,
  });

  const envSummary = summarizeEnvironment();
  logDebug("startup", "Environment configuration", envSummary);

  await logServiceHealth(envSummary);
}

function readPackageVersion() {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    const raw = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as { version?: string };
    return raw.version || "unknown";
  } catch (error) {
    logError("startup", "Failed to read package.json", safeError(error));
    return "unknown";
  }
}

function summarizeEnvironment() {
  const requiredEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "set" : "missing",
  };

  return {
    nodeEnv: process.env.NODE_ENV || "undefined",
    appEnv: process.env.APP_ENV || "undefined",
    host: process.env.HOST || "0.0.0.0",
    port: process.env.PORT || "3000",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "undefined",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? maskedValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { keepStart: 4, keepEnd: 3 })
      : "missing",
    rustdeskHost: "rustdesk.bwb.pt",
    rustdeskKeyMasked: maskedValue("Rs16v4T5zElCIsxbcAn39LwRYniVi5EQbXAgLVqWFYk=", { keepStart: 6, keepEnd: 4 }),
    requiredEnv,
  };
}

async function logServiceHealth(envSummary: Record<string, unknown>) {
  const state = loggerState();
  if (!state.enabled) return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    logError("startup", "Supabase URL missing. Skipping health check.", envSummary);
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${supabaseUrl}/functions/v1/login`, {
      method: "OPTIONS",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    logInfo("startup", "Supabase login endpoint reachable", {
      status: response.status,
      ok: response.ok,
    });
  } catch (error) {
    logError("startup", "Failed to reach Supabase login endpoint", safeError(error));
  }
}
