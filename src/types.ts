/** The JSON-RPC 2.0 shapes this proxy reads and writes. */
export type JsonRpcId = string | number | null;

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method?: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

/** The subset of the server card (SEP-1649) the no-key preview serves. */
export interface ServerCard {
  serverInfo: { name: string; version: string; title?: string; [key: string]: unknown };
  instructions?: string;
  documentation?: string;
  transport?: { type: string; url: string };
  authentication?: { required: boolean; schemes: string[]; [key: string]: unknown };
  tools: Record<string, unknown>[];
  prompts?: Record<string, unknown>[];
  resources?: Record<string, unknown>[];
  resourceTemplates?: Record<string, unknown>[];
  [key: string]: unknown;
}
