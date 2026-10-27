import { MCP_CLIENTS } from "./clients.js";
import type { AuthMode, McpClient, McpEnvironment, SetupContext, SetupStep } from "./types.js";

export { MCP_CLIENTS } from "./clients.js";
export {
  base64,
  base64Json,
  bearer,
  configStep,
  PROXY_ARGS,
  proxyCommand,
  proxyEntry,
  proxyEnv,
  queryString,
  toJson,
  toToml,
  toYaml,
  wrapAt,
} from "./render.js";
export type * from "./types.js";

/** The key every client stores the server under. */
export const MCP_SERVER_NAME = "nodes2cloud";

/** Shown wherever the real token isn't known, e.g. in docs. */
export const MCP_TOKEN_PLACEHOLDER = "n2c_pat_YOUR_TOKEN";

export const MCP_ENDPOINTS: Record<McpEnvironment, string> = {
  production: "https://api.nodes2cloud.com/mcp",
  staging: "https://api-staging.nodes2cloud.com/mcp",
  local: "http://localhost:8787/mcp",
};

/**
 * Infers the environment from an endpoint. Anything that isn't the production
 * URL counts as non-production, so the proxy is told its endpoint explicitly.
 */
export function environmentForUrl(url: string): McpEnvironment {
  if (url === MCP_ENDPOINTS.production) return "production";
  if (url.includes("localhost") || url.includes("127.0.0.1")) return "local";
  return "staging";
}

export function setupContext(options: Partial<SetupContext> & { url: string }): SetupContext {
  return {
    name: MCP_SERVER_NAME,
    environment: environmentForUrl(options.url),
    token: MCP_TOKEN_PLACEHOLDER,
    ...options,
  };
}

/**
 * Clients we show users. A low-confidence entry stays hidden until someone has
 * connected it end to end and recorded `verification.handTested`.
 */
export function isListed(client: McpClient): boolean {
  return client.verification.confidence !== "low" || Boolean(client.verification.handTested);
}

export function listedClients(): McpClient[] {
  return MCP_CLIENTS.filter(isListed);
}

/** Looks a client up by id or alias (`windsurf` → Devin Desktop), case-insensitively. */
export function findClient(idOrAlias: string): McpClient | undefined {
  const key = idOrAlias.trim().toLowerCase();
  return MCP_CLIENTS.find((client) => client.id === key || client.aliases?.includes(key));
}

/** The modes a client supports, OAuth first because it needs no token. */
export function authModes(client: McpClient): AuthMode[] {
  return (["oauth", "token"] as const).filter((mode) => client.setup[mode] !== undefined);
}

export function buildSetup(client: McpClient, mode: AuthMode, ctx: SetupContext): SetupStep[] {
  const builder = client.setup[mode];
  if (!builder) {
    throw new Error(`${client.label} has no ${mode} setup.`);
  }
  return builder(ctx);
}
