import type { JsonRpcError, JsonRpcId, JsonRpcRequest } from "./types.js";
import { USER_AGENT } from "./version.js";

/**
 * Forwards each JSON-RPC message from stdin to the remote Streamable HTTP
 * endpoint and writes every message it answers with to stdout.
 *
 * Failures are reported as what they are. An earlier version answered
 * `initialize` and `tools/list` itself whenever the server refused, so a bad
 * token, a plan limit or an outage all looked like "connected, 0 tools".
 */

export interface ProxyOptions {
  endpoint: string;
  apiKey: string;
  /** Writes one JSON-RPC message to the client (stdout). */
  send: (message: unknown) => void;
  /** Diagnostics for humans (stderr); never protocol traffic. */
  log: (line: string) => void;
  fetchImpl?: typeof fetch;
}

/** JSON-RPC server-error codes this proxy uses, all inside the reserved -32000..-32099 range. */
export const ERROR_CODES = {
  http: -32000,
  unauthorized: -32001,
  planRequired: -32002,
  rateLimited: -32003,
  unavailable: -32004,
  network: -32005,
  badResponse: -32603,
} as const;

interface ServerErrorEnvelope {
  error?: { code?: string; message?: string; remediation?: string };
}

const TOKEN_HELP =
  "Create a new Personal Access Token in Nodes2Cloud (Integrations → MCP server → Headless & CI Tokens) and run `npx -y n2c-mcp install`, or connect your client to https://api.nodes2cloud.com/mcp directly and sign in with OAuth.";

/** Maps a refused HTTP response to a JSON-RPC error a person can act on. */
export function httpError(status: number, body: unknown): JsonRpcError {
  const envelope = (body && typeof body === "object" ? body : {}) as ServerErrorEnvelope;
  const serverMessage = envelope.error?.message;
  const data = { httpStatus: status, ...(envelope.error ? { error: envelope.error } : {}) };
  if (status === 401) {
    return {
      code: ERROR_CODES.unauthorized,
      message: `Nodes2Cloud rejected the token: it is invalid, expired or revoked. ${TOKEN_HELP}`,
      data,
    };
  }
  if (status === 402) {
    return {
      code: ERROR_CODES.planRequired,
      message:
        `${serverMessage ?? "This Nodes2Cloud plan does not include MCP access."} ${envelope.error?.remediation ?? ""}`.trim(),
      data,
    };
  }
  if (status === 429) {
    return {
      code: ERROR_CODES.rateLimited,
      message: "Too many requests to Nodes2Cloud. Wait a moment and try again.",
      data,
    };
  }
  if (status === 503) {
    return {
      code: ERROR_CODES.unavailable,
      message: serverMessage ?? "The Nodes2Cloud MCP server is temporarily unavailable.",
      data,
    };
  }
  return {
    code: ERROR_CODES.http,
    message: `Nodes2Cloud answered HTTP ${status}${serverMessage ? `: ${serverMessage}` : "."}`,
    data,
  };
}

/**
 * Every JSON-RPC message in a response body: plain JSON (one message or a
 * batch) or an SSE stream, where each event's `data:` lines join into one message.
 */
export function parseResponseBody(text: string, contentType: string | null): unknown[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (!contentType?.includes("text/event-stream")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Fall through: some servers send SSE without the content type.
    }
  }
  const messages: unknown[] = [];
  for (const event of trimmed.split(/\r?\n\r?\n/)) {
    const data = event
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""))
      .join("\n");
    if (!data) continue;
    try {
      const parsed = JSON.parse(data) as unknown;
      messages.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      // An event that is not JSON-RPC (e.g. a keep-alive comment) carries nothing to forward.
    }
  }
  return messages;
}

function idsOf(payload: unknown): JsonRpcId[] {
  const messages = Array.isArray(payload) ? payload : [payload];
  return messages.flatMap((message) => {
    const id = (message as JsonRpcRequest | null)?.id;
    return id === undefined ? [] : [id];
  });
}

export function createProxy(options: ProxyOptions) {
  const fetchImpl = options.fetchImpl ?? fetch;
  /** Negotiated by `initialize`; the spec requires it on every later request. */
  let protocolVersion: string | undefined;
  let sessionId: string | undefined;

  function replyError(payload: unknown, error: JsonRpcError): void {
    const ids = idsOf(payload);
    // A notification has nobody waiting for an answer: tell the human instead.
    if (ids.length === 0) {
      options.log(`n2c-mcp: ${error.message}`);
      return;
    }
    for (const id of ids) options.send({ jsonrpc: "2.0", id, error });
  }

  async function forward(payload: unknown): Promise<void> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${options.apiKey}`,
      "User-Agent": USER_AGENT,
      // A display label on approval prompts, never an identity.
      "X-N2C-Client-Name": "n2c-mcp-cli",
    };
    if (protocolVersion) headers["MCP-Protocol-Version"] = protocolVersion;
    if (sessionId) headers["Mcp-Session-Id"] = sessionId;

    let response: Response;
    try {
      response = await fetchImpl(options.endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    } catch (err) {
      replyError(payload, {
        code: ERROR_CODES.network,
        message: `Could not reach ${options.endpoint}: ${err instanceof Error ? err.message : String(err)}. Check your connection, or N2C_MCP_ENDPOINT if you set it.`,
      });
      return;
    }

    const text = await response.text();
    if (!response.ok) {
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        // A non-JSON error page: keep the status, drop the body.
      }
      const error = httpError(response.status, body);
      if (response.status === 401) options.log(`n2c-mcp: ${error.message}`);
      replyError(payload, error);
      return;
    }

    const newSession = response.headers.get("Mcp-Session-Id");
    if (newSession) sessionId = newSession;

    const messages = parseResponseBody(text, response.headers.get("Content-Type"));
    if (messages.length === 0) {
      // 202 Accepted for a notification, or an empty answer to a request.
      if (idsOf(payload).length > 0) {
        replyError(payload, {
          code: ERROR_CODES.badResponse,
          message: `Nodes2Cloud returned an empty or unreadable response (HTTP ${response.status}).`,
        });
      }
      return;
    }
    for (const message of messages) {
      const result = (message as { result?: { protocolVersion?: unknown } }).result;
      if (typeof result?.protocolVersion === "string") protocolVersion = result.protocolVersion;
      options.send(message);
    }
  }

  return {
    /** Handles one stdin line. Never throws. */
    async handleLine(line: string): Promise<void> {
      if (!line.trim()) return;
      let payload: unknown;
      try {
        payload = JSON.parse(line);
      } catch {
        options.send({
          jsonrpc: "2.0",
          id: null,
          error: { code: -32700, message: "Parse error: stdin line is not JSON." },
        });
        return;
      }
      await forward(payload);
    },
  };
}
