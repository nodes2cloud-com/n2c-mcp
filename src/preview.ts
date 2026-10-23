import { BUNDLED_SERVER_CARD } from "./bundled-card.js";
import type { JsonRpcRequest, ServerCard } from "./types.js";
import { DOCS_URL, SUPPORTED_PROTOCOL_VERSIONS, USER_AGENT } from "./version.js";

/**
 * No-key preview: with no token configured, answer as a read-only catalogue of
 * the server's tools, prompts and resource templates, taken from its public
 * server card, so a client or directory can see what Nodes2Cloud offers before
 * signing in. Every tool call answers with how to connect; nothing is ever
 * sent to Nodes2Cloud except the unauthenticated card request.
 */

const SETUP_MESSAGE = [
  "Nodes2Cloud is not connected yet: no N2C_API_KEY is set, so this server is only showing its tool list.",
  "To connect, either point your client at https://api.nodes2cloud.com/mcp and sign in with OAuth (recommended),",
  "or create a Personal Access Token in Nodes2Cloud (Integrations → MCP server → Headless & CI Tokens) and run `npx -y n2c-mcp install`.",
  `Setup guide: ${DOCS_URL}`,
].join(" ");

const CARD_TIMEOUT_MS = 5_000;

/** The live card from the endpoint's origin, or the copy bundled with this release. */
export async function loadServerCard(
  endpoint: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ card: ServerCard; source: "live" | "bundled" }> {
  try {
    const url = new URL("/.well-known/mcp/server-card.json", endpoint);
    const res = await fetchImpl(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(CARD_TIMEOUT_MS),
    });
    if (res.ok) {
      const card = (await res.json()) as ServerCard;
      if (Array.isArray(card.tools) && card.serverInfo) return { card, source: "live" };
    }
  } catch {
    // Offline, or a server without a card: the bundled copy still describes this release.
  }
  return { card: BUNDLED_SERVER_CARD, source: "bundled" };
}

/** The answer to one request in preview mode, or `undefined` for a notification. */
export function previewResponse(card: ServerCard, request: JsonRpcRequest): unknown {
  if (request.id === undefined) return undefined;
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id: request.id, result });
  const fail = (code: number, message: string) => ({
    jsonrpc: "2.0",
    id: request.id,
    error: { code, message },
  });

  switch (request.method) {
    case "initialize": {
      const requested = request.params?.protocolVersion;
      const protocolVersion =
        typeof requested === "string" && SUPPORTED_PROTOCOL_VERSIONS.includes(requested)
          ? requested
          : SUPPORTED_PROTOCOL_VERSIONS[0];
      return reply({
        protocolVersion,
        capabilities: { tools: {}, prompts: {}, resources: {} },
        serverInfo: card.serverInfo,
        instructions: `${SETUP_MESSAGE}\n\n${card.instructions ?? ""}`.trim(),
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: card.tools });
    case "prompts/list":
      return reply({ prompts: card.prompts ?? [] });
    case "resources/list":
      return reply({ resources: card.resources ?? [] });
    case "resources/templates/list":
      return reply({ resourceTemplates: card.resourceTemplates ?? [] });
    case "tools/call":
      // A tool result, not a protocol error, so the model reads it and can tell the user.
      return reply({ isError: true, content: [{ type: "text", text: SETUP_MESSAGE }] });
    case "prompts/get":
    case "resources/read":
    case "completion/complete":
      return fail(-32001, SETUP_MESSAGE);
    default:
      return fail(-32601, `Method not found: ${String(request.method)}`);
  }
}

export function previewNotice(source: "live" | "bundled"): string {
  return `n2c-mcp: no N2C_API_KEY set; running in preview mode (tool list from the ${source === "live" ? "live" : "bundled"} server card, tool calls disabled). ${DOCS_URL}`;
}
