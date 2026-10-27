/**
 * Types for the MCP client registry: how each MCP client (IDE, CLI, chat app,
 * SDK) connects to the Nodes2Cloud remote MCP server.
 *
 * This folder is deliberately dependency-free (no zod, no DOM, no Node APIs) so
 * the same files render byte-identical snippets in the web app, the docs site
 * (`n2c-home` gen-data) and the `n2c-mcp` installer, which vendors a copy.
 * Imports carry `.js` extensions for that reason: the installer builds with
 * NodeNext resolution.
 */

export type McpEnvironment = "production" | "staging" | "local";

/** `oauth`: the client signs in through the browser. `token`: a Personal Access Token. */
export type AuthMode = "oauth" | "token";

export type OsName = "mac" | "linux" | "win";

export type ClientCategory = "ide" | "extension" | "cli" | "chat" | "automation" | "sdk";

/** What a setup builder needs. `token` is a placeholder in `oauth` mode and in docs. */
export interface SetupContext {
  /** Server key in the client's config, `nodes2cloud`. */
  name: string;
  /** The Streamable HTTP endpoint, e.g. `https://api.nodes2cloud.com/mcp`. */
  url: string;
  environment: McpEnvironment;
  token: string;
  /** Picks per-OS details such as `npx.cmd` on Windows. Unset renders the POSIX form. */
  os?: OsName;
}

/**
 * Where a config file lives. `~` is the home directory, `%APPDATA%` and
 * `%USERPROFILE%` are the Windows variables, and a relative path is relative to
 * the project root. `os` unset means every OS.
 */
export interface ConfigLocation {
  scope: "user" | "project";
  os?: OsName[];
  path: string;
}

export type ConfigFormat = "json" | "toml" | "yaml";

export interface ConfigTarget {
  format: ConfigFormat;
  locations: ConfigLocation[];
  /**
   * Where the server entry sits inside the file, e.g. `["mcpServers", "nodes2cloud"]`.
   * With `entry`, lets an installer merge into an existing file instead of overwriting it.
   */
  keyPath: string[];
  entry: Record<string, unknown>;
}

/** One rendered step of a client's setup, in the order the user follows them. */
export type SetupStep =
  | { kind: "link"; label: string; href: string }
  | { kind: "command"; label: string; command: string }
  | { kind: "config"; label: string; target: ConfigTarget; content: string }
  | { kind: "steps"; label: string; steps: string[] }
  | { kind: "code"; label: string; language: CodeLanguage; code: string };

export type CodeLanguage = "json" | "yaml" | "toml" | "bash" | "typescript" | "python";

export type SetupBuilder = (ctx: SetupContext) => SetupStep[];

export type Confidence = "high" | "medium" | "low";

export interface McpClient {
  /** Stable id used in URLs (`/docs/mcp/kiro`) and by the installer (`--client kiro`). */
  id: string;
  label: string;
  category: ClientCategory;
  /** Short line under the name. */
  summary: string;
  /** Former names and successors that should resolve to this entry. */
  aliases?: string[];
  /** Shown first in the app's connect panel. */
  featured?: boolean;
  /** Setup per auth mode. A missing mode is one the client cannot do. */
  setup: Partial<Record<AuthMode, SetupBuilder>>;
  /** Gotchas worth a line in the UI. */
  notes?: string[];
  /** The vendor page these instructions were checked against. */
  docsUrl: string;
  verification: {
    /** How well the vendor documents what we render. */
    confidence: Confidence;
    /** When the docs were last checked (YYYY-MM-DD). */
    checked: string;
    /**
     * Set once a person has connected this client end to end (add, sign in,
     * `tools/list`, call `check_setup`). Low-confidence entries stay unlisted until then.
     */
    handTested?: { date: string; clientVersion?: string };
  };
}
