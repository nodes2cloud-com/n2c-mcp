import type { ConfigLocation, ConfigTarget, SetupContext, SetupStep } from "./types.js";

/** The value every client sends when it uses a Personal Access Token. */
export function bearer(ctx: SetupContext): string {
  return `Bearer ${ctx.token}`;
}

/** Nests `entry` under `keyPath`: `(["a","b"], x)` gives `{ a: { b: x } }`. */
export function wrapAt(keyPath: string[], entry: unknown): Record<string, unknown> {
  let value: unknown = entry;
  for (let i = keyPath.length - 1; i >= 0; i--) {
    value = { [keyPath[i] as string]: value };
  }
  return value as Record<string, unknown>;
}

export function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Standard, padded base64 of an ASCII string. Hand-rolled because this folder
 * may not assume `btoa` or `Buffer` (it compiles without DOM or Node types).
 */
export function base64(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i += 3) {
    const a = text.charCodeAt(i);
    const b = i + 1 < text.length ? text.charCodeAt(i + 1) : Number.NaN;
    const c = i + 2 < text.length ? text.charCodeAt(i + 2) : Number.NaN;
    if (a > 127 || b > 127 || c > 127) throw new Error("base64() only encodes ASCII.");
    const bits = (a << 16) | ((b || 0) << 8) | (c || 0);
    out += BASE64_ALPHABET[(bits >> 18) & 63];
    out += BASE64_ALPHABET[(bits >> 12) & 63];
    out += Number.isNaN(b) ? "=" : BASE64_ALPHABET[(bits >> 6) & 63];
    out += Number.isNaN(c) ? "=" : BASE64_ALPHABET[bits & 63];
  }
  return out;
}

/** Base64 of JSON, which is all a deeplink config ever holds (URLs are ASCII). */
export function base64Json(value: unknown): string {
  return base64(JSON.stringify(value));
}

/** `a=1&b=2` with every value percent-encoded (spaces as `%20`, never `+`). */
export function queryString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

// --- TOML (Codex's `config.toml`) -------------------------------------------

function tomlKey(key: string): string {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : JSON.stringify(key);
}

function tomlValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.map(tomlValue).join(", ")}]`;
  if (value && typeof value === "object") {
    const pairs = Object.entries(value).map(([k, v]) => `${tomlKey(k)} = ${tomlValue(v)}`);
    return `{ ${pairs.join(", ")} }`;
  }
  throw new Error(`Unsupported TOML value: ${String(value)}`);
}

/** One table, `[a.b]`, whose values are scalars, arrays or inline tables. */
export function toToml(keyPath: string[], entry: Record<string, unknown>): string {
  const lines = [`[${keyPath.map(tomlKey).join(".")}]`];
  for (const [key, value] of Object.entries(entry)) {
    lines.push(`${tomlKey(key)} = ${tomlValue(value)}`);
  }
  return lines.join("\n");
}

// --- YAML (Goose, Continue) ---------------------------------------------------

const YAML_RESERVED = /^(true|false|null|yes|no|on|off|~)$/i;

function yamlScalar(value: unknown): string {
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  const text = String(value);
  const plain =
    /^[A-Za-z0-9][A-Za-z0-9_./@:-]*$/.test(text) &&
    !YAML_RESERVED.test(text) &&
    !/^[0-9.]+$/.test(text) &&
    !text.includes(": ");
  // A JSON string is a valid YAML double-quoted scalar.
  return plain ? text : JSON.stringify(text);
}

function isBranch(value: unknown): value is Record<string, unknown> | unknown[] {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value) && typeof value === "object" && Object.keys(value as object).length > 0;
}

function yamlLeaf(value: unknown): string {
  if (Array.isArray(value)) return "[]";
  if (value && typeof value === "object") return "{}";
  return yamlScalar(value);
}

function yamlLines(value: Record<string, unknown> | unknown[], indent: number): string[] {
  const pad = " ".repeat(indent);
  const lines: string[] = [];
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isBranch(item)) {
        lines.push(`${pad}- ${yamlLeaf(item)}`);
        continue;
      }
      const nested = yamlLines(item, indent + 2);
      const [first = "", ...rest] = nested;
      lines.push(`${pad}- ${first.slice(indent + 2)}`, ...rest);
    }
    return lines;
  }
  for (const [key, child] of Object.entries(value)) {
    if (isBranch(child)) {
      lines.push(`${pad}${key}:`, ...yamlLines(child, indent + 2));
    } else {
      lines.push(`${pad}${key}: ${yamlLeaf(child)}`);
    }
  }
  return lines;
}

export function toYaml(value: Record<string, unknown>): string {
  return yamlLines(value, 0).join("\n");
}

// --- Step helpers ------------------------------------------------------------

/** Renders a mergeable config file as its own step. */
export function configStep(
  label: string,
  format: ConfigTarget["format"],
  locations: ConfigLocation[],
  keyPath: string[],
  entry: Record<string, unknown>,
): SetupStep {
  const target: ConfigTarget = { format, locations, keyPath, entry };
  let content: string;
  if (format === "toml") content = toToml(keyPath, entry);
  else if (format === "yaml") content = toYaml(wrapAt(keyPath, entry));
  else content = toJson(wrapAt(keyPath, entry));
  return { kind: "config", label, target, content };
}

/** The local stdio proxy (`n2c-mcp`), for clients that only launch local servers. */
export function proxyCommand(ctx: SetupContext): string {
  return ctx.os === "win" ? "npx.cmd" : "npx";
}

export const PROXY_ARGS = ["-y", "n2c-mcp"] as const;

/** The proxy reads the endpoint from `N2C_MCP_ENDPOINT`; production is its default. */
export function proxyEnv(ctx: SetupContext): Record<string, string> {
  return ctx.environment === "production"
    ? { N2C_API_KEY: ctx.token }
    : { N2C_API_KEY: ctx.token, N2C_MCP_ENDPOINT: ctx.url };
}

/** The common `{ command, args, env }` stdio entry. */
export function proxyEntry(ctx: SetupContext): Record<string, unknown> {
  return { command: proxyCommand(ctx), args: [...PROXY_ARGS], env: proxyEnv(ctx) };
}
