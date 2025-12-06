import fs from "fs";
import path from "path";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LoggerState {
  initialized: boolean;
  logPath: string;
  enabled: boolean;
  writable: boolean;
}

const configuredLogPath = process.env.APP_DEBUG_LOG_PATH || "/var/log/rustdesk-mesh/app-debug.log";
const fallbackLogPath = path.join(process.cwd(), "logs", "app-debug.log");

const state: LoggerState = {
  initialized: false,
  logPath: configuredLogPath,
  enabled: normalizeBoolean(process.env.APP_DEBUG_ENABLED, false),
  writable: false,
};

const redactionPlaceholder = "[hidden]";

function normalizeBoolean(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function ensureDirectoryExists(targetPath: string) {
  const dir = path.dirname(targetPath);
  fs.mkdirSync(dir, { recursive: true });
}

function serializeMeta(meta?: Record<string, unknown>): string {
  if (!meta) return "";
  try {
    return " " + JSON.stringify(meta);
  } catch (error) {
    return ` {"meta_serialization_error":"${(error as Error).message}"}`;
  }
}

function writeLine(level: LogLevel, context: string, message: string, meta?: Record<string, unknown>) {
  if (!state.writable) return;
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] [${context}] ${message}${serializeMeta(meta)}\n`;
  try {
    fs.appendFileSync(state.logPath, line, { encoding: "utf-8" });
  } catch (error) {
    console.error(`[debugLogger] Failed to write log line: ${(error as Error).message}`);
  }
}

export function initializeDebugLogger() {
  if (state.initialized) return state;
  const primaryPath = state.logPath;
  let initialized = tryInitializePath(primaryPath);

  if (!initialized && fallbackLogPath !== primaryPath) {
    console.error(`[debugLogger] Falling back to ${fallbackLogPath} after failure with ${primaryPath}`);
    initialized = tryInitializePath(fallbackLogPath);
    if (initialized) {
      writeLine("WARN", "startup", "Primary debug log path unavailable; using fallback path", {
        primaryPath,
        fallbackLogPath,
      });
    }
  }

  state.initialized = true;
  return state;
}

function tryInitializePath(targetPath: string) {
  try {
    ensureDirectoryExists(targetPath);
    fs.writeFileSync(targetPath, "", { encoding: "utf-8" });
    state.logPath = targetPath;
    state.writable = true;
    writeLine("INFO", "startup", "Debug logger initialized", {
      logPath: targetPath,
      debugEnabled: state.enabled,
    });
    if (!state.enabled) {
      writeLine("INFO", "startup", "APP_DEBUG_ENABLED is false — debug log will remain minimal.");
    }
    return true;
  } catch (error) {
    state.writable = false;
    console.error(`[debugLogger] Could not initialize debug log at ${targetPath}: ${(error as Error).message}`);
    return false;
  }
}

export function logDebug(context: string, message: string, meta?: Record<string, unknown>) {
  if (!state.enabled) return;
  writeLine("DEBUG", context, message, meta);
}

export function logInfo(context: string, message: string, meta?: Record<string, unknown>) {
  if (!state.enabled) return;
  writeLine("INFO", context, message, meta);
}

export function logWarn(context: string, message: string, meta?: Record<string, unknown>) {
  if (!state.enabled) return;
  writeLine("WARN", context, message, meta);
}

export function logError(context: string, message: string, meta?: Record<string, unknown>) {
  writeLine("ERROR", context, message, meta);
}

export function loggerState() {
  return { ...state };
}

export function maskedValue(value?: string | null, options?: { keepStart?: number; keepEnd?: number }) {
  if (!value) return redactionPlaceholder;
  const keepStart = options?.keepStart ?? 2;
  const keepEnd = options?.keepEnd ?? 2;
  if (value.length <= keepStart + keepEnd) return redactionPlaceholder;
  return `${value.slice(0, keepStart)}…${value.slice(value.length - keepEnd)}`;
}

export function maskEmail(email?: string | null) {
  if (!email) return redactionPlaceholder;
  const [user, domain] = email.split("@");
  if (!domain) return maskedValue(email, { keepStart: 1, keepEnd: 1 });
  return `${maskedValue(user, { keepStart: 1, keepEnd: 1 })}@${domain}`;
}

export function safeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  return { message: String(error) };
}

export function correlationId(prefix = "req") {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  }
}
