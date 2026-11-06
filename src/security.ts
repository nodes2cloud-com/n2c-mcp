import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Guards for where the Personal Access Token goes. The token can deploy into the user's
 * Cloudflare account, so it must only travel over TLS, never sit in shell history, and never
 * land in a file that gets committed.
 */

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/**
 * The reason `endpoint` can't carry a token, or undefined when it can: https, or plain http to
 * this machine only (local development against `wrangler dev`).
 */
export function endpointProblem(endpoint: string): string | undefined {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return `"${endpoint}" is not a valid URL.`;
  }
  if (url.protocol === "https:") return undefined;
  if (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname)) return undefined;
  return `"${endpoint}" is not https. The token would be sent in clear text; use an https:// endpoint (plain http is allowed only for localhost).`;
}

/** Hosts the official endpoints use; anything else gets a one-line heads-up, not a refusal. */
export function isNodes2CloudHost(endpoint: string): boolean {
  try {
    const { hostname } = new URL(endpoint);
    return (
      hostname === "nodes2cloud.com" ||
      hostname.endsWith(".nodes2cloud.com") ||
      LOOPBACK_HOSTS.has(hostname)
    );
  } catch {
    return false;
  }
}

export type GitIgnoreStatus = "ignored" | "tracked-or-unignored" | "no-repo";

/**
 * Whether git would ignore `filePath`, so a token written there can't be committed by accident.
 * `no-repo` when the file isn't inside a git work tree (or git isn't installed).
 */
export function gitIgnoreStatus(filePath: string): GitIgnoreStatus {
  // The config's folder may not exist yet (e.g. `.cursor/`); ask from the nearest one that does.
  let cwd = path.dirname(filePath);
  while (!fs.existsSync(cwd) && path.dirname(cwd) !== cwd) cwd = path.dirname(cwd);
  const result = spawnSync("git", ["check-ignore", "-q", "--", path.relative(cwd, filePath)], {
    cwd,
    stdio: "ignore",
  });
  if (result.error) return "no-repo";
  if (result.status === 0) return "ignored";
  if (result.status === 1) return "tracked-or-unignored";
  return "no-repo";
}
