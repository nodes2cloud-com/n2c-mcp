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

export type GitIgnoreStatus = "ignored" | "tracked-or-unignored" | "no-repo" | "unknown";

/** The nearest directory at or above `dir` that exists, or the root. */
function nearestExisting(dir: string): string {
  let current = dir;
  while (!fs.existsSync(current) && path.dirname(current) !== current) {
    current = path.dirname(current);
  }
  return current;
}

/** Whether `dir` or any ancestor holds a `.git` entry (a folder, or a file for worktrees). */
function insideGitWorkTree(dir: string): boolean {
  let current = path.resolve(dir);
  for (;;) {
    if (fs.existsSync(path.join(current, ".git"))) return true;
    const parent = path.dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

/**
 * Whether git would ignore `filePath`, so a token written there can't be committed by accident.
 * `no-repo` only when no folder at or above the file holds a `.git`. Inside a repository, any
 * answer git can't give (git missing, a git error) is `unknown`, and callers must treat that as
 * unsafe: failing open would write the token into a file that may be committed.
 */
export function gitIgnoreStatus(filePath: string): GitIgnoreStatus {
  // The config's folder may not exist yet (e.g. `.cursor/`); ask from the nearest one that does.
  const cwd = nearestExisting(path.dirname(path.resolve(filePath)));
  if (!insideGitWorkTree(cwd) && !insideGitWorkTree(realpathOr(cwd))) return "no-repo";
  const result = spawnSync("git", ["check-ignore", "-q", "--", path.relative(cwd, filePath)], {
    cwd,
    stdio: "ignore",
  });
  if (result.error) return "unknown";
  if (result.status === 0) return "ignored";
  if (result.status === 1) return "tracked-or-unignored";
  return "unknown";
}

function realpathOr(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return p;
  }
}

/**
 * Whether `filePath`, with every symlink in its existing part resolved, stays inside `root`.
 * A project-scope config reached through a committed symlink (e.g. `.roo -> /elsewhere`) does not,
 * so a token written there would land wherever the repository author pointed it.
 */
export function staysInside(root: string, filePath: string): boolean {
  const resolved = path.resolve(filePath);
  const existing = nearestExisting(resolved);
  let real = path.join(realpathOr(existing), path.relative(existing, resolved));
  // An existing file that is itself a symlink counts too.
  if (fs.existsSync(resolved)) real = realpathOr(resolved);
  const rel = path.relative(realpathOr(path.resolve(root)), real);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}
