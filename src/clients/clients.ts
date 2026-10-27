import { base64Json, bearer, configStep, proxyEntry, queryString, toJson } from "./render.js";
import type { ConfigLocation, McpClient, SetupContext, SetupStep } from "./types.js";

/**
 * Every MCP client we document. Each entry was checked against the vendor page
 * in `docsUrl` on `verification.checked`; field names are the vendor's and vary
 * a lot (`servers` vs `mcpServers`, `url` vs `serverUrl` vs `httpUrl` vs `uri`).
 * The golden tests pin every rendered snippet, so a change here shows up as a diff.
 *
 * `confidence: "low"` entries are kept for when someone tests them by hand, but
 * `listedClients()` leaves them out until `handTested` is set.
 */

const CHECKED = "2026-10-27";

const AUTH_HEADER = "Authorization";

function headers(ctx: SetupContext): Record<string, string> {
  return { [AUTH_HEADER]: bearer(ctx) };
}

const home = (path: string): ConfigLocation => ({ scope: "user", path });
const project = (path: string): ConfigLocation => ({ scope: "project", path });

const VSCODE_USER = (dir: string): ConfigLocation[] => [
  { scope: "user", os: ["mac"], path: `~/Library/Application Support/${dir}/User/mcp.json` },
  { scope: "user", os: ["linux"], path: `~/.config/${dir}/User/mcp.json` },
  { scope: "user", os: ["win"], path: `%APPDATA%\\${dir}\\User\\mcp.json` },
];

const CLAUDE_DESKTOP_CONFIG: ConfigLocation[] = [
  {
    scope: "user",
    os: ["mac"],
    path: "~/Library/Application Support/Claude/claude_desktop_config.json",
  },
  { scope: "user", os: ["win"], path: "%APPDATA%\\Claude\\claude_desktop_config.json" },
];

/** `{ mcpServers: { nodes2cloud: <proxy> } }`, the stdio form most clients accept. */
function proxyConfig(label: string, locations: ConfigLocation[], ctx: SetupContext): SetupStep {
  return configStep(label, "json", locations, ["mcpServers", ctx.name], proxyEntry(ctx));
}

function vscodeFamily(id: string, label: string, dir: string, cli: string, insiders: boolean) {
  const entry = (ctx: SetupContext) => ({ type: "http", url: ctx.url });
  const installLink = (ctx: SetupContext) => {
    const query = queryString({
      name: ctx.name,
      config: JSON.stringify(entry(ctx)),
      ...(insiders ? { quality: "insiders" } : {}),
    });
    return `https://vscode.dev/redirect/mcp/install?${query}`;
  };
  const locations = [project(".vscode/mcp.json"), ...VSCODE_USER(dir)];
  const client: McpClient = {
    id,
    label,
    category: "ide",
    summary: "Copilot agent mode, through the built-in MCP support.",
    featured: !insiders,
    setup: {
      oauth: (ctx) => [
        { kind: "link", label: `Install in ${label}`, href: installLink(ctx) },
        {
          kind: "command",
          label: "Or from a terminal",
          command: `${cli} --add-mcp '${JSON.stringify({ name: ctx.name, ...entry(ctx) })}'`,
        },
        configStep("Or add it to mcp.json", "json", locations, ["servers", ctx.name], entry(ctx)),
      ],
      token: (ctx) => [
        configStep("Add it to mcp.json", "json", locations, ["servers", ctx.name], {
          ...entry(ctx),
          headers: headers(ctx),
        }),
      ],
    },
    notes: ["The file's top-level key is `servers`, not `mcpServers`."],
    docsUrl: "https://code.visualstudio.com/docs/copilot/customization/mcp-servers",
    verification: { confidence: "high", checked: CHECKED },
  };
  return client;
}

export const MCP_CLIENTS: McpClient[] = [
  // --- IDEs and editors ------------------------------------------------------
  {
    id: "cursor",
    label: "Cursor",
    category: "ide",
    summary: "One-click install; Cursor opens the browser to sign in.",
    featured: true,
    setup: {
      oauth: (ctx) => [
        {
          kind: "link",
          label: "Add to Cursor",
          href: `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(ctx.name)}&config=${encodeURIComponent(base64Json({ url: ctx.url }))}`,
        },
        configStep(
          "Or add it to mcp.json",
          "json",
          [project(".cursor/mcp.json"), home("~/.cursor/mcp.json")],
          ["mcpServers", ctx.name],
          { url: ctx.url },
        ),
      ],
      token: (ctx) => [
        configStep(
          "Add it to mcp.json",
          "json",
          [project(".cursor/mcp.json"), home("~/.cursor/mcp.json")],
          ["mcpServers", ctx.name],
          { url: ctx.url, headers: headers(ctx) },
        ),
      ],
    },
    docsUrl: "https://cursor.com/docs/mcp",
    verification: { confidence: "high", checked: CHECKED },
  },
  vscodeFamily("vscode", "VS Code", "Code", "code", false),
  vscodeFamily("vscode-insiders", "VS Code Insiders", "Code - Insiders", "code-insiders", true),
  {
    id: "visual-studio",
    label: "Visual Studio",
    category: "ide",
    summary: "Visual Studio 2022 17.14+ and 2026, in Copilot agent mode (Windows).",
    setup: {
      oauth: (ctx) => [
        {
          kind: "link",
          label: "Install in Visual Studio",
          href: `https://vs-open.link/mcp-install?${encodeURIComponent(JSON.stringify({ name: ctx.name, type: "http", url: ctx.url }))}`,
        },
        configStep(
          "Or add it to .mcp.json",
          "json",
          // Visual Studio only runs on Windows, so the solution-level file is Windows-only too.
          [
            { scope: "user", os: ["win"], path: "%USERPROFILE%\\.mcp.json" },
            { scope: "project", os: ["win"], path: ".mcp.json" },
          ],
          ["servers", ctx.name],
          { type: "http", url: ctx.url },
        ),
      ],
    },
    notes: ["Sign in from the “Authentication Required” CodeLens above the server in .mcp.json."],
    docsUrl: "https://learn.microsoft.com/en-us/visualstudio/ide/mcp-servers",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "kiro",
    label: "Kiro",
    category: "ide",
    summary: "One-click install for the Kiro IDE.",
    featured: true,
    setup: {
      oauth: (ctx) => [
        {
          kind: "link",
          label: "Add to Kiro",
          href: `https://kiro.dev/launch/mcp/add?name=${encodeURIComponent(ctx.name)}&config=${encodeURIComponent(JSON.stringify({ url: ctx.url }))}`,
        },
        configStep(
          "Or add it to mcp.json",
          "json",
          [home("~/.kiro/settings/mcp.json"), project(".kiro/settings/mcp.json")],
          ["mcpServers", ctx.name],
          { url: ctx.url },
        ),
      ],
      token: (ctx) => [
        configStep(
          "Add it to mcp.json",
          "json",
          [home("~/.kiro/settings/mcp.json"), project(".kiro/settings/mcp.json")],
          ["mcpServers", ctx.name],
          { url: ctx.url, headers: headers(ctx) },
        ),
      ],
    },
    docsUrl: "https://kiro.dev/docs/mcp/configuration/",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "antigravity",
    label: "Antigravity",
    category: "ide",
    summary: "Google Antigravity's app, IDE and `agy` CLI share one config file.",
    featured: true,
    setup: {
      oauth: (ctx) => [
        configStep(
          "Add it to mcp_config.json",
          "json",
          [home("~/.gemini/config/mcp_config.json")],
          ["mcpServers", ctx.name],
          { serverUrl: ctx.url },
        ),
        {
          kind: "steps",
          label: "Then sign in",
          steps: [
            "Open Settings → Customizations and choose Authenticate next to nodes2cloud.",
            "Approve access in the browser, then paste the code it shows back into Antigravity.",
          ],
        },
      ],
      token: (ctx) => [
        configStep(
          "Add it to mcp_config.json",
          "json",
          [home("~/.gemini/config/mcp_config.json")],
          ["mcpServers", ctx.name],
          { serverUrl: ctx.url, headers: headers(ctx) },
        ),
      ],
    },
    notes: [
      "The field is `serverUrl`; Antigravity ignores `httpUrl`.",
      "Paste the token itself: Antigravity doesn't expand environment variables in headers.",
      "Older installs read ~/.gemini/antigravity/mcp_config.json instead.",
    ],
    docsUrl: "https://antigravity.google/docs/mcp",
    verification: { confidence: "medium", checked: CHECKED },
  },
  {
    id: "devin",
    label: "Devin Desktop",
    category: "ide",
    summary: "Formerly Windsurf. The Devin Local agent and the Devin CLI.",
    aliases: ["windsurf", "devin-cli"],
    setup: {
      oauth: (ctx) => [
        {
          kind: "command",
          label: "Add the server",
          command: `devin mcp add -s user ${ctx.name} ${ctx.url}`,
        },
        { kind: "command", label: "Sign in", command: `devin mcp login ${ctx.name}` },
      ],
      token: (ctx) => [
        {
          kind: "command",
          label: "Add the server",
          command: `devin mcp add -s user ${ctx.name} ${ctx.url} -H "${AUTH_HEADER}: ${bearer(ctx)}"`,
        },
      ],
    },
    docsUrl: "https://docs.devin.ai/cli/extensibility/mcp/configuration",
    verification: { confidence: "medium", checked: CHECKED },
  },
  {
    id: "windsurf-cascade",
    label: "Windsurf (Cascade)",
    category: "ide",
    summary: "The legacy Cascade agent.",
    setup: {
      oauth: (ctx) => [
        configStep(
          "Add it to mcp_config.json",
          "json",
          [home("~/.codeium/windsurf/mcp_config.json")],
          ["mcpServers", ctx.name],
          { serverUrl: ctx.url },
        ),
      ],
    },
    notes: ["Vendor docs disagree on the config path since the Devin rename."],
    docsUrl: "https://docs.devin.ai/desktop/cascade/mcp",
    verification: { confidence: "low", checked: CHECKED },
  },
  {
    id: "zed",
    label: "Zed",
    category: "ide",
    summary: "Zed's agent panel, as a remote context server.",
    setup: {
      oauth: (ctx) => [
        configStep(
          "Add it to settings.json",
          "json",
          [{ scope: "user", os: ["mac", "linux"], path: "~/.config/zed/settings.json" }],
          ["context_servers", ctx.name],
          { url: ctx.url },
        ),
      ],
      token: (ctx) => [
        configStep(
          "Add it to settings.json",
          "json",
          [{ scope: "user", os: ["mac", "linux"], path: "~/.config/zed/settings.json" }],
          ["context_servers", ctx.name],
          { url: ctx.url, headers: headers(ctx) },
        ),
      ],
    },
    notes: ["Zed's key is `context_servers`. With no Authorization header it runs OAuth."],
    docsUrl: "https://zed.dev/docs/ai/mcp",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "junie",
    label: "JetBrains Junie",
    category: "ide",
    summary: "Junie in JetBrains IDEs and the Junie CLI.",
    setup: {
      oauth: (ctx) => [
        configStep(
          "Add it to mcp.json",
          "json",
          [home("~/.junie/mcp/mcp.json"), project(".junie/mcp/mcp.json")],
          ["mcpServers", ctx.name],
          { url: ctx.url },
        ),
        {
          kind: "steps",
          label: "Then sign in",
          steps: ["Run /mcp, pick nodes2cloud and choose Authorize."],
        },
      ],
      token: (ctx) => [
        configStep(
          "Add it to mcp.json",
          "json",
          [home("~/.junie/mcp/mcp.json"), project(".junie/mcp/mcp.json")],
          ["mcpServers", ctx.name],
          { url: ctx.url, headers: headers(ctx) },
        ),
      ],
    },
    docsUrl: "https://junie.jetbrains.com/docs/junie-cli-mcp-configuration.html",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "jetbrains-ai",
    label: "JetBrains AI Assistant",
    category: "ide",
    summary: "AI Assistant in IntelliJ IDEA, PyCharm, WebStorm and the rest.",
    setup: {
      token: (ctx) => [
        {
          kind: "steps",
          label: "Open the MCP settings",
          steps: [
            "Settings → Tools → AI Assistant → Model Context Protocol (MCP).",
            "Choose Add, switch to JSON and paste the config below.",
          ],
        },
        proxyConfig("Paste this config", [], ctx),
      ],
    },
    notes: ["Uses the local n2c-mcp proxy (needs Node.js); remote sign-in isn't documented yet."],
    docsUrl: "https://www.jetbrains.com/help/ai-assistant/mcp.html",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "trae",
    label: "Trae",
    category: "ide",
    summary: "ByteDance's Trae IDE.",
    setup: {
      token: (ctx) => [
        configStep(
          "Add it to mcp.json",
          "json",
          [project(".trae/mcp.json")],
          ["mcpServers", ctx.name],
          {
            url: ctx.url,
            headers: headers(ctx),
          },
        ),
      ],
    },
    docsUrl: "https://docs.trae.ai/ide/model-context-protocol",
    verification: { confidence: "low", checked: CHECKED },
  },

  // --- Editor extensions -----------------------------------------------------
  {
    id: "cline",
    label: "Cline",
    category: "extension",
    summary: "The Cline extension and the Cline CLI.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "command",
          label: "With the Cline CLI",
          command: `cline mcp add ${ctx.name} ${ctx.url} --transport http`,
        },
        {
          kind: "steps",
          label: "Or in the extension",
          steps: [
            "Open Cline → MCP Servers → Configure → Configure MCP Servers.",
            "Add the entry below, then choose Authorize next to nodes2cloud.",
          ],
        },
        configStep("cline_mcp_settings.json", "json", [], ["mcpServers", ctx.name], {
          type: "streamableHttp",
          url: ctx.url,
        }),
      ],
      token: (ctx) => [
        {
          kind: "command",
          label: "With the Cline CLI",
          command: `cline mcp add ${ctx.name} ${ctx.url} --transport http --header "${AUTH_HEADER}: ${bearer(ctx)}"`,
        },
        configStep("Or in cline_mcp_settings.json", "json", [], ["mcpServers", ctx.name], {
          type: "streamableHttp",
          url: ctx.url,
          headers: headers(ctx),
        }),
      ],
    },
    notes: ["`type` is required: without it Cline assumes the legacy SSE transport."],
    docsUrl: "https://docs.cline.bot/mcp/configuring-mcp-servers",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "roo-code",
    label: "Roo Code",
    category: "extension",
    summary: "Roo Code connects with a Personal Access Token.",
    setup: {
      token: (ctx) => [
        configStep(
          "Add it to .roo/mcp.json",
          "json",
          [project(".roo/mcp.json")],
          ["mcpServers", ctx.name],
          {
            type: "streamable-http",
            url: ctx.url,
            headers: headers(ctx),
          },
        ),
      ],
    },
    notes: ["Roo Code has no OAuth for remote servers yet."],
    docsUrl: "https://roocodeinc.github.io/Roo-Code/features/mcp/using-mcp-in-roo",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "kilo-code",
    label: "Kilo Code",
    category: "extension",
    summary: "Kilo's CLI, VS Code and JetBrains builds share one config.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "command",
          label: "Add the server",
          command: `kilo mcp add ${ctx.name} --url ${ctx.url}`,
        },
        { kind: "command", label: "Sign in", command: `kilo mcp auth ${ctx.name}` },
      ],
      token: (ctx) => [
        configStep(
          "Add it to kilo.json",
          "json",
          [home("~/.config/kilo/kilo.json"), project("kilo.json")],
          ["mcp", ctx.name],
          { type: "remote", url: ctx.url, enabled: true, headers: headers(ctx) },
        ),
      ],
    },
    docsUrl: "https://kilo.ai/docs/automate/mcp/using-in-cli",
    verification: { confidence: "medium", checked: CHECKED },
  },
  {
    id: "continue",
    label: "Continue",
    category: "extension",
    summary: "Continue's agent mode, through the local n2c-mcp proxy.",
    setup: {
      token: (ctx) => [
        configStep(
          "Create .continue/mcpServers/nodes2cloud.yaml",
          "yaml",
          [project(".continue/mcpServers/nodes2cloud.yaml")],
          [],
          {
            name: "Nodes2Cloud",
            version: "0.0.1",
            schema: "v1",
            mcpServers: [{ name: ctx.name, type: "stdio", ...proxyEntry(ctx) }],
          },
        ),
      ],
    },
    notes: [
      "Continue drops custom headers on remote servers, so this uses the local proxy (needs Node.js).",
      "MCP tools only run in Agent mode.",
    ],
    docsUrl: "https://docs.continue.dev/customize/deep-dives/mcp",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "augment",
    label: "Augment Code",
    category: "extension",
    summary: "Augment in VS Code and JetBrains, and the Auggie CLI.",
    setup: {
      token: (ctx) => [
        {
          kind: "command",
          label: "With the Auggie CLI",
          command: `auggie mcp add ${ctx.name} --transport http --url ${ctx.url} --header "${AUTH_HEADER}:${bearer(ctx)}"`,
        },
        configStep(
          "Or add it to settings.json",
          "json",
          [home("~/.augment/settings.json")],
          ["mcpServers", ctx.name],
          {
            type: "http",
            url: ctx.url,
            headers: headers(ctx),
          },
        ),
      ],
    },
    notes: ["In the IDE: Settings → MCP → Import from JSON, then paste the entry."],
    docsUrl: "https://docs.augmentcode.com/setup-augment/mcp",
    verification: { confidence: "high", checked: CHECKED },
  },

  // --- Agent CLIs and terminals ---------------------------------------------
  {
    id: "claude-code",
    label: "Claude Code",
    category: "cli",
    summary: "One command; Claude Code opens the browser to sign in.",
    featured: true,
    setup: {
      oauth: (ctx) => [
        {
          kind: "command",
          label: "Run in your project",
          command: `claude mcp add --transport http ${ctx.name} ${ctx.url}`,
        },
        {
          kind: "steps",
          label: "Then sign in",
          steps: ["Run /mcp in Claude Code and choose Authenticate."],
        },
      ],
      token: (ctx) => [
        {
          kind: "command",
          label: "Run in your project",
          command: `claude mcp add --transport http ${ctx.name} ${ctx.url} --header "${AUTH_HEADER}: ${bearer(ctx)}"`,
        },
      ],
    },
    notes: ["Add `--scope user` to use it in every project."],
    docsUrl: "https://docs.claude.com/en/docs/claude-code/mcp",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "cursor-cli",
    label: "Cursor CLI",
    category: "cli",
    summary: "Cursor's `agent` CLI reads the same mcp.json as the editor.",
    aliases: ["cursor-agent"],
    setup: {
      oauth: (ctx) => [
        configStep(
          "Add it to mcp.json",
          "json",
          [home("~/.cursor/mcp.json"), project(".cursor/mcp.json")],
          ["mcpServers", ctx.name],
          { url: ctx.url },
        ),
        { kind: "command", label: "Sign in", command: `agent mcp login ${ctx.name}` },
      ],
      token: (ctx) => [
        configStep(
          "Add it to mcp.json",
          "json",
          [home("~/.cursor/mcp.json"), project(".cursor/mcp.json")],
          ["mcpServers", ctx.name],
          { url: ctx.url, headers: headers(ctx) },
        ),
      ],
    },
    docsUrl: "https://cursor.com/docs/cli/mcp",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "codex",
    label: "OpenAI Codex",
    category: "cli",
    summary: "The Codex CLI, IDE extension and app share config.toml.",
    featured: true,
    setup: {
      oauth: (ctx) => [
        {
          kind: "command",
          label: "Add the server",
          command: `codex mcp add ${ctx.name} --url ${ctx.url}`,
        },
        { kind: "command", label: "Sign in", command: `codex mcp login ${ctx.name}` },
        configStep(
          "Or add it to config.toml",
          "toml",
          [home("~/.codex/config.toml"), project(".codex/config.toml")],
          ["mcp_servers", ctx.name],
          { url: ctx.url },
        ),
      ],
      token: (ctx) => [
        configStep(
          "Add it to config.toml",
          "toml",
          [home("~/.codex/config.toml")],
          ["mcp_servers", ctx.name],
          { url: ctx.url, http_headers: headers(ctx) },
        ),
      ],
    },
    notes: ['Using a token? `bearer_token_env_var = "N2C_API_KEY"` keeps it out of the file.'],
    docsUrl: "https://developers.openai.com/codex/mcp",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "gemini-cli",
    label: "Gemini CLI",
    category: "cli",
    summary: "Gemini CLI with an API key or Code Assist licence.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "command",
          label: "Add the server",
          command: `gemini mcp add -s user -t http ${ctx.name} ${ctx.url}`,
        },
        configStep(
          "Or add it to settings.json",
          "json",
          [home("~/.gemini/settings.json"), project(".gemini/settings.json")],
          ["mcpServers", ctx.name],
          { httpUrl: ctx.url },
        ),
      ],
      token: (ctx) => [
        {
          kind: "command",
          label: "Add the server",
          command: `gemini mcp add -s user -t http -H "${AUTH_HEADER}: ${bearer(ctx)}" ${ctx.name} ${ctx.url}`,
        },
      ],
    },
    notes: [
      "Use `httpUrl`: in Gemini CLI a bare `url` means the legacy SSE transport.",
      "Individual Google accounts moved to Antigravity CLI in June 2026.",
    ],
    docsUrl: "https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/mcp-server.md",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "copilot-cli",
    label: "GitHub Copilot CLI",
    category: "cli",
    summary: "The `copilot` terminal agent.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "command",
          label: "Add the server",
          command: `copilot mcp add --transport http ${ctx.name} ${ctx.url}`,
        },
        configStep(
          "Or add it to mcp-config.json",
          "json",
          [home("~/.copilot/mcp-config.json")],
          ["mcpServers", ctx.name],
          { type: "http", url: ctx.url, tools: ["*"] },
        ),
      ],
      token: (ctx) => [
        {
          kind: "command",
          label: "Add the server",
          command: `copilot mcp add --transport http --header "${AUTH_HEADER}: ${bearer(ctx)}" ${ctx.name} ${ctx.url}`,
        },
      ],
    },
    notes: ['`tools` is required in the file; `["*"]` enables every tool.'],
    docsUrl:
      "https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "kiro-cli",
    label: "Kiro CLI",
    category: "cli",
    summary: "Kiro's terminal agent, which replaced the Amazon Q Developer CLI.",
    aliases: ["amazon-q", "q-cli"],
    setup: {
      token: (ctx) => [
        configStep(
          "Add it to mcp.json",
          "json",
          [home("~/.kiro/settings/mcp.json"), project(".kiro/settings/mcp.json")],
          ["mcpServers", ctx.name],
          { url: ctx.url, headers: headers(ctx) },
        ),
      ],
      oauth: (ctx) => [
        configStep(
          "Add it to mcp.json",
          "json",
          [home("~/.kiro/settings/mcp.json"), project(".kiro/settings/mcp.json")],
          ["mcpServers", ctx.name],
          { url: ctx.url },
        ),
        { kind: "steps", label: "Then sign in", steps: ["Run /mcp auth in kiro-cli."] },
      ],
    },
    notes: [
      "Some kiro-cli versions reject the sign-in with “issuer mismatch”; the token works on every version.",
    ],
    docsUrl: "https://kiro.dev/docs/mcp/configuration/",
    verification: { confidence: "medium", checked: CHECKED },
  },
  {
    id: "opencode",
    label: "OpenCode",
    category: "cli",
    summary: "sst/opencode in the terminal.",
    setup: {
      oauth: (ctx) => [
        configStep(
          "Add it to opencode.json",
          "json",
          [home("~/.config/opencode/opencode.json"), project("opencode.json")],
          ["mcp", ctx.name],
          { type: "remote", url: ctx.url, enabled: true },
        ),
        { kind: "command", label: "Sign in", command: `opencode mcp auth ${ctx.name}` },
      ],
      token: (ctx) => [
        configStep(
          "Add it to opencode.json",
          "json",
          [home("~/.config/opencode/opencode.json"), project("opencode.json")],
          ["mcp", ctx.name],
          { type: "remote", url: ctx.url, enabled: true, oauth: false, headers: headers(ctx) },
        ),
      ],
    },
    docsUrl: "https://opencode.ai/docs/mcp-servers/",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "amp",
    label: "Amp",
    category: "cli",
    summary: "Sourcegraph's Amp; it opens the browser to sign in on start.",
    setup: {
      oauth: (ctx) => [
        { kind: "command", label: "Add the server", command: `amp mcp add ${ctx.name} ${ctx.url}` },
      ],
      token: (ctx) => [
        configStep(
          "Add it to settings.json",
          "json",
          [home("~/.config/amp/settings.json")],
          ["amp.mcpServers", ctx.name],
          { url: ctx.url, headers: headers(ctx) },
        ),
      ],
    },
    docsUrl: "https://ampcode.com/docs/markdown/customize/mcp",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "factory-droid",
    label: "Factory Droid",
    category: "cli",
    summary: "Factory's `droid` CLI.",
    aliases: ["droid", "factory"],
    setup: {
      oauth: (ctx) => [
        {
          kind: "command",
          label: "Add the server",
          command: `droid mcp add ${ctx.name} ${ctx.url} --type http`,
        },
        {
          kind: "steps",
          label: "Then sign in",
          steps: ["Run /mcp in droid and authenticate nodes2cloud."],
        },
      ],
      token: (ctx) => [
        {
          kind: "command",
          label: "Add the server",
          command: `droid mcp add ${ctx.name} ${ctx.url} --type http --header "${AUTH_HEADER}: ${bearer(ctx)}" --no-oauth`,
        },
      ],
    },
    docsUrl: "https://docs.factory.com/cli/configuration/mcp",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "qwen-code",
    label: "Qwen Code",
    category: "cli",
    summary: "Alibaba's Qwen Code CLI.",
    setup: {
      token: (ctx) => [
        {
          kind: "command",
          label: "Add the server",
          command: `qwen mcp add --transport http ${ctx.name} ${ctx.url} --header "${AUTH_HEADER}: ${bearer(ctx)}"`,
        },
      ],
      oauth: (ctx) => [
        configStep(
          "Add it to settings.json",
          "json",
          [home("~/.qwen/settings.json"), project(".qwen/settings.json")],
          ["mcpServers", ctx.name],
          { httpUrl: ctx.url, oauth: { enabled: true } },
        ),
        {
          kind: "steps",
          label: "Then sign in",
          steps: ["Run /mcp in Qwen Code and authenticate nodes2cloud."],
        },
      ],
    },
    notes: ["Use `httpUrl`: a bare `url` means the legacy SSE transport."],
    docsUrl: "https://qwenlm.github.io/qwen-code-docs/en/users/features/mcp/",
    verification: { confidence: "medium", checked: CHECKED },
  },
  {
    id: "goose",
    label: "Goose",
    category: "cli",
    summary: "Goose desktop and CLI, as a remote extension.",
    setup: {
      oauth: (ctx) => {
        const query = queryString({
          url: ctx.url,
          type: "streamable_http",
          id: ctx.name,
          name: "Nodes2Cloud",
          description: "Build and deploy Cloudflare workflows",
          timeout: "300",
        });
        return [
          { kind: "link", label: "Add to Goose", href: `goose://extension?${query}` },
          {
            kind: "command",
            label: "Or for one session",
            command: `goose session --with-streamable-http-extension "${ctx.url}"`,
          },
        ];
      },
      token: (ctx) => [
        configStep(
          "Add it to config.yaml",
          "yaml",
          [
            { scope: "user", os: ["mac", "linux"], path: "~/.config/goose/config.yaml" },
            { scope: "user", os: ["win"], path: "%APPDATA%\\Block\\goose\\config\\config.yaml" },
          ],
          ["extensions", ctx.name],
          {
            name: ctx.name,
            type: "streamable_http",
            uri: ctx.url,
            headers: headers(ctx),
            enabled: true,
            timeout: 300,
          },
        ),
      ],
    },
    notes: ["Goose names the field `uri`, not `url`."],
    docsUrl:
      "https://github.com/aaif-goose/goose/blob/main/documentation/docs/getting-started/using-extensions.md",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "warp",
    label: "Warp",
    category: "cli",
    summary: "Warp's agent, from Settings.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "steps",
          label: "Add the server",
          steps: [
            "Settings → Agents → MCP servers → + Add.",
            "Choose “Streamable HTTP or SSE Server (URL)”, paste the JSON below and save.",
            "Start the server; Warp opens the browser to sign in.",
          ],
        },
        {
          kind: "code",
          label: "Server JSON",
          language: "json",
          code: toJson({ [ctx.name]: { url: ctx.url } }),
        },
      ],
      token: (ctx) => [
        {
          kind: "steps",
          label: "Add the server",
          steps: [
            "Settings → Agents → MCP servers → + Add.",
            "Choose “Streamable HTTP or SSE Server (URL)”, paste the JSON below and save.",
          ],
        },
        {
          kind: "code",
          label: "Server JSON",
          language: "json",
          code: toJson({ [ctx.name]: { url: ctx.url, headers: headers(ctx) } }),
        },
      ],
    },
    docsUrl: "https://docs.warp.dev/knowledge-and-collaboration/mcp",
    verification: { confidence: "medium", checked: CHECKED },
  },
  {
    id: "crush",
    label: "Crush",
    category: "cli",
    summary: "Charm's Crush terminal agent.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "code",
          label: "Add to crushrc",
          language: "bash",
          code: `mcp add ${ctx.name} --type http --url ${ctx.url} --oauth true --sessionless true`,
        },
      ],
    },
    notes: ["Our server is stateless, so Crush needs `sessionless`."],
    docsUrl: "https://github.com/charmbracelet/crush",
    verification: { confidence: "low", checked: CHECKED },
  },

  // --- Chat and desktop apps -------------------------------------------------
  {
    id: "claude",
    label: "Claude",
    category: "chat",
    summary: "Claude on the web, desktop and mobile, as a custom connector.",
    aliases: ["claude-desktop", "claude-ai"],
    featured: true,
    setup: {
      oauth: (ctx) => [
        {
          kind: "steps",
          label: "Add a custom connector",
          steps: [
            "Open claude.ai/customize/connectors (in the desktop app: Customize → Connectors).",
            "Choose + → Add custom connector.",
            `Name it Nodes2Cloud and paste ${ctx.url} as the URL, then Add.`,
            "Choose Connect and approve access in the browser.",
          ],
        },
      ],
      token: (ctx) => [
        {
          kind: "steps",
          label: "Claude Desktop, with the local proxy",
          steps: ["Add the entry below to claude_desktop_config.json, then restart Claude."],
        },
        proxyConfig("claude_desktop_config.json", CLAUDE_DESKTOP_CONFIG, ctx),
      ],
    },
    notes: [
      "A connector added on the web also appears in the desktop and mobile apps.",
      "On Team and Enterprise plans an owner adds it under Organization settings → Connectors.",
      "claude_desktop_config.json only runs local servers, which is why the token path uses the proxy.",
    ],
    docsUrl:
      "https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "chatgpt",
    label: "ChatGPT",
    category: "chat",
    summary: "ChatGPT on the web, as a custom MCP plugin.",
    featured: true,
    setup: {
      oauth: (ctx) => [
        {
          kind: "steps",
          label: "Add a custom MCP server",
          steps: [
            "In ChatGPT on the web, open Plugins → + → Add custom MCP server.",
            `Name it Nodes2Cloud, paste ${ctx.url} as the Server URL and choose OAuth.`,
            "Create it, install it and approve access in the browser.",
            "Mention @nodes2cloud in a chat to use it.",
          ],
        },
      ],
    },
    notes: [
      "Documented for Business, Enterprise and Edu workspaces; an admin may need to allow MCP plugins.",
      "ChatGPT can't send custom headers, so there is no token option.",
    ],
    docsUrl:
      "https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt",
    verification: { confidence: "medium", checked: CHECKED },
  },
  {
    id: "mistral-vibe",
    label: "Mistral Vibe",
    category: "chat",
    summary: "Formerly Le Chat, as a custom MCP connector.",
    aliases: ["le-chat", "mistral"],
    setup: {
      oauth: (ctx) => [
        {
          kind: "steps",
          label: "Add a custom connector",
          steps: [
            "Open Connectors → + Add Connector → Custom MCP Connector.",
            `Name it nodes2cloud and paste ${ctx.url} as the Server URL.`,
            "Choose Connect and approve access in the browser.",
          ],
        },
      ],
    },
    notes: ["Only workspace admins can add connectors; on personal plans that's you."],
    docsUrl: "https://docs.mistral.ai/vibe/work/connectors/mcp-connectors",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "perplexity",
    label: "Perplexity",
    category: "chat",
    summary: "Perplexity custom remote connectors.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "steps",
          label: "Add a custom connector",
          steps: [
            "Settings → Connectors → Add custom → Add MCP connector.",
            `Paste ${ctx.url}, choose OAuth and Streamable HTTP.`,
          ],
        },
      ],
    },
    docsUrl:
      "https://www.perplexity.ai/help-center/en/articles/13915507-adding-custom-remote-connectors",
    verification: { confidence: "low", checked: CHECKED },
  },
  {
    id: "lm-studio",
    label: "LM Studio",
    category: "chat",
    summary: "LM Studio 0.3.17 and later.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "link",
          label: "Add to LM Studio",
          href: `lmstudio://add_mcp?name=${encodeURIComponent(ctx.name)}&config=${encodeURIComponent(base64Json({ url: ctx.url }))}`,
        },
        configStep(
          "Or edit mcp.json",
          "json",
          [home("~/.lmstudio/mcp.json")],
          ["mcpServers", ctx.name],
          {
            url: ctx.url,
          },
        ),
      ],
      token: (ctx) => [
        configStep(
          "Edit mcp.json",
          "json",
          [home("~/.lmstudio/mcp.json")],
          ["mcpServers", ctx.name],
          {
            url: ctx.url,
            headers: headers(ctx),
          },
        ),
      ],
    },
    notes: ["In the app: Program tab → Install → Edit mcp.json."],
    docsUrl: "https://lmstudio.ai/docs/app/mcp",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "raycast",
    label: "Raycast",
    category: "chat",
    summary: "Raycast AI on macOS and iOS.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "steps",
          label: "Install the server",
          steps: [
            "Run the Install MCP Server command.",
            `Name it Nodes2Cloud, choose Transport HTTP and paste ${ctx.url}.`,
            "Set OAuth Type to Dynamic, press ⌘↵, then Sign In.",
          ],
        },
      ],
      token: (ctx) => [
        {
          kind: "steps",
          label: "Install the server",
          steps: [
            "Run the Install MCP Server command.",
            `Name it Nodes2Cloud, choose Transport HTTP and paste ${ctx.url}.`,
            `Add the HTTP header ${AUTH_HEADER}: ${bearer(ctx)} and press ⌘↵.`,
          ],
        },
      ],
    },
    docsUrl: "https://manual.raycast.com/ai/model-context-protocol",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "jan",
    label: "Jan",
    category: "chat",
    summary: "The Jan desktop app.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "steps",
          label: "Add the server",
          steps: [
            "Settings → MCP Servers → + Add MCP Server.",
            `Choose Transport HTTP, paste ${ctx.url} and turn it on.`,
            "Choose Sign in on the server and approve access in the browser.",
          ],
        },
      ],
      token: (ctx) => [
        {
          kind: "steps",
          label: "Add the server",
          steps: [
            "Settings → MCP Servers → + Add MCP Server.",
            `Choose Transport HTTP, paste ${ctx.url} and add the header ${AUTH_HEADER}: ${bearer(ctx)}.`,
          ],
        },
      ],
    },
    docsUrl: "https://docs.jan.ai/desktop/integrations/mcp-servers",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "msty",
    label: "Msty Studio",
    category: "chat",
    summary: "Msty Studio's Toolbox.",
    setup: {
      token: (ctx) => [
        {
          kind: "steps",
          label: "Add the tool",
          steps: [
            "Toolbox → Tools → Add New Tool → HTTP.",
            `Paste ${ctx.url} and add the header ${AUTH_HEADER}: ${bearer(ctx)}.`,
            "Name it nodes2cloud, add it to a Toolset and pick that Toolset in your chat.",
          ],
        },
      ],
    },
    docsUrl: "https://docs.msty.ai/studio/toolbox/tools",
    verification: { confidence: "medium", checked: CHECKED },
  },
  {
    id: "cherry-studio",
    label: "Cherry Studio",
    category: "chat",
    summary: "Cherry Studio desktop.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "link",
          label: "Add to Cherry Studio",
          href: `cherrystudio://mcp/install?servers=${encodeURIComponent(base64Json({ mcpServers: { [ctx.name]: { type: "streamableHttp", baseUrl: ctx.url } } }))}`,
        },
      ],
    },
    docsUrl: "https://github.com/CherryHQ/cherry-studio",
    verification: { confidence: "low", checked: CHECKED },
  },
  {
    id: "5ire",
    label: "5ire",
    category: "chat",
    summary: "The 5ire desktop assistant.",
    setup: {
      token: (ctx) => [
        {
          kind: "link",
          label: "Add to 5ire",
          href: `app.5ire://install-tool#${base64Json({ key: ctx.name, type: "remote", url: ctx.url })}`,
        },
      ],
    },
    docsUrl: "https://github.com/nanbingxyz/5ire",
    verification: { confidence: "low", checked: CHECKED },
  },
  {
    id: "boltai",
    label: "BoltAI",
    category: "chat",
    summary: "BoltAI on macOS.",
    setup: {
      token: (ctx) => [
        proxyConfig("Add it to ~/.boltai/mcp.json", [home("~/.boltai/mcp.json")], ctx),
      ],
    },
    docsUrl: "https://docs.boltai.com/docs/plugins/mcp-servers",
    verification: { confidence: "low", checked: CHECKED },
  },

  // --- Enterprise, automation and dev tools ----------------------------------
  {
    id: "copilot-studio",
    label: "Microsoft Copilot Studio",
    category: "automation",
    summary: "Give a Copilot Studio agent the Nodes2Cloud tools.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "steps",
          label: "Add an MCP tool",
          steps: [
            "Open your agent → Tools → Add a tool → New tool → Model Context Protocol.",
            `Name it Nodes2Cloud, add a description and paste ${ctx.url} as the server URL.`,
            "Under Authentication choose OAuth 2.0 → Dynamic discovery, then Create.",
            "Create a connection, sign in, then choose Add to agent.",
          ],
        },
      ],
    },
    docsUrl:
      "https://learn.microsoft.com/en-us/microsoft-copilot-studio/mcp-add-existing-server-to-agent",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "m365-copilot",
    label: "Microsoft 365 Copilot",
    category: "automation",
    summary: "A declarative agent built with the Microsoft 365 Agents Toolkit.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "steps",
          label: "Add an MCP action",
          steps: [
            "In the Agents Toolkit, open your declarative agent → Add an Action → Start with an MCP Server.",
            `Paste ${ctx.url} and choose OAuth with dynamic client registration.`,
          ],
        },
      ],
    },
    docsUrl:
      "https://learn.microsoft.com/en-us/microsoft-365/copilot/extensibility/build-mcp-plugins",
    verification: { confidence: "low", checked: CHECKED },
  },
  {
    id: "n8n",
    label: "n8n",
    category: "automation",
    summary: "The MCP Client Tool node on an n8n AI Agent.",
    setup: {
      token: (ctx) => [
        {
          kind: "steps",
          label: "Add the MCP Client Tool",
          steps: [
            "On an AI Agent node, add the tool MCP Client Tool.",
            `Set the endpoint to ${ctx.url} and Server Transport to HTTP Streamable.`,
            "Set Authentication to Bearer Auth and create a credential holding your token.",
          ],
        },
      ],
    },
    docsUrl:
      "https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolmcp/",
    verification: { confidence: "medium", checked: CHECKED },
  },
  {
    id: "zapier",
    label: "Zapier",
    category: "automation",
    summary: "Zapier's MCP Client app, in Zaps and Zapier Agents.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "steps",
          label: "Connect the MCP Client app",
          steps: [
            "Add an MCP Client step (Run Tool) and connect a new account.",
            `Server URL ${ctx.url}, Transport Streamable HTTP, OAuth Yes.`,
            "Sign in and approve access.",
          ],
        },
      ],
      token: (ctx) => [
        {
          kind: "steps",
          label: "Connect the MCP Client app",
          steps: [
            "Add an MCP Client step (Run Tool) and connect a new account.",
            `Server URL ${ctx.url}, Transport Streamable HTTP, OAuth No.`,
            "Paste your token as the Bearer Token.",
          ],
        },
      ],
    },
    docsUrl: "https://help.zapier.com/hc/en-us/articles/38777069364109",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "make",
    label: "Make",
    category: "automation",
    summary: "Make's MCP Client app.",
    setup: {
      token: (ctx) => [
        {
          kind: "steps",
          label: "Create a connection",
          steps: [
            "Add an MCP Client module (Call a tool) and create a connection.",
            `Choose + New MCP Server, paste ${ctx.url} and paste your token as the access token.`,
          ],
        },
      ],
    },
    docsUrl: "https://community.make.com/t/feature-spotlight-make-mcp-client/86534",
    verification: { confidence: "medium", checked: CHECKED },
  },
  {
    id: "postman",
    label: "Postman",
    category: "automation",
    summary: "Explore and call the tools from a Postman MCP request.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "steps",
          label: "Create an MCP request",
          steps: [
            `New → MCP → HTTP, and paste ${ctx.url}.`,
            "On the Authorization tab choose OAuth 2.0 and sign in.",
            "Choose Load Capabilities.",
          ],
        },
      ],
      token: (ctx) => [
        {
          kind: "steps",
          label: "Create an MCP request",
          steps: [
            `New → MCP → HTTP, and paste ${ctx.url}.`,
            "On the Authorization tab choose Bearer Token and paste your token.",
            "Choose Load Capabilities.",
          ],
        },
      ],
    },
    docsUrl: "https://learning.postman.com/docs/postman-ai/mcp-requests/create/",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "mcp-inspector",
    label: "MCP Inspector",
    category: "automation",
    summary: "The protocol's own debugging tool.",
    setup: {
      oauth: (ctx) => [
        {
          kind: "command",
          label: "Start the Inspector",
          command: "npx @modelcontextprotocol/inspector",
        },
        {
          kind: "steps",
          label: "Connect",
          steps: [`Choose Streamable HTTP, paste ${ctx.url} and run the Quick OAuth Flow.`],
        },
      ],
      token: (ctx) => [
        {
          kind: "command",
          label: "List the tools from a terminal",
          command: `npx @modelcontextprotocol/inspector --cli ${ctx.url} --method tools/list --header "${AUTH_HEADER}: ${bearer(ctx)}"`,
        },
      ],
    },
    docsUrl: "https://github.com/modelcontextprotocol/inspector",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "docker",
    label: "Docker MCP Toolkit",
    category: "automation",
    summary: "Docker Desktop's MCP Toolkit and gateway.",
    setup: {
      oauth: () => [
        {
          kind: "steps",
          label: "Add from the catalog",
          steps: [
            "MCP Toolkit → Catalog → Nodes2Cloud → add it, then authorize on its Configuration tab.",
          ],
        },
      ],
    },
    notes: ["Needs the Docker MCP Catalog listing first."],
    docsUrl: "https://docs.docker.com/ai/mcp-catalog-and-toolkit/toolkit/",
    verification: { confidence: "low", checked: CHECKED },
  },

  // --- SDKs --------------------------------------------------------------------
  {
    id: "openai-api",
    label: "OpenAI API",
    category: "sdk",
    summary: "The Responses API's hosted MCP tool.",
    setup: {
      token: (ctx) => [
        {
          kind: "code",
          label: "Python",
          language: "python",
          code: `import os
from openai import OpenAI

client = OpenAI()
response = client.responses.create(
    model="gpt-5",
    input="List my Nodes2Cloud workflows.",
    tools=[{
        "type": "mcp",
        "server_label": "${ctx.name}",
        "server_url": "${ctx.url}",
        "authorization": os.environ["N2C_API_KEY"],
        "require_approval": "always",
    }],
)
print(response.output_text)`,
        },
      ],
    },
    docsUrl: "https://developers.openai.com/api/docs/guides/tools-connectors-mcp",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "anthropic-api",
    label: "Claude API",
    category: "sdk",
    summary: "The Messages API MCP connector.",
    setup: {
      token: (ctx) => [
        {
          kind: "code",
          label: "TypeScript",
          language: "typescript",
          code: `import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();
const message = await anthropic.beta.messages.create({
  model: "claude-sonnet-4-5",
  max_tokens: 1024,
  betas: ["mcp-client-2025-11-20"],
  mcp_servers: [
    {
      type: "url",
      url: "${ctx.url}",
      name: "${ctx.name}",
      authorization_token: process.env.N2C_API_KEY,
    },
  ],
  tools: [{ type: "mcp_toolset", mcp_server_name: "${ctx.name}" }],
  messages: [{ role: "user", content: "List my Nodes2Cloud workflows." }],
});`,
        },
      ],
    },
    docsUrl: "https://platform.claude.com/docs/en/docs/agents-and-tools/mcp-connector",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "vercel-ai-sdk",
    label: "Vercel AI SDK",
    category: "sdk",
    summary: "`createMCPClient` from @ai-sdk/mcp.",
    setup: {
      token: (ctx) => [
        {
          kind: "code",
          label: "TypeScript",
          language: "typescript",
          code: `import { createMCPClient } from "@ai-sdk/mcp";

const mcp = await createMCPClient({
  transport: {
    type: "http",
    url: "${ctx.url}",
    headers: { Authorization: \`Bearer \${process.env.N2C_API_KEY}\` },
  },
});
const tools = await mcp.tools();
// Pass \`tools\` to generateText or streamText, then:
await mcp.close();`,
        },
      ],
    },
    docsUrl: "https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "langchain",
    label: "LangChain",
    category: "sdk",
    summary: "langchain-mcp-adapters, for LangChain and LangGraph agents.",
    aliases: ["langgraph"],
    setup: {
      token: (ctx) => [
        {
          kind: "code",
          label: "Python",
          language: "python",
          code: `import os
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({
    "${ctx.name}": {
        "transport": "streamable_http",
        "url": "${ctx.url}",
        "headers": {"Authorization": f"Bearer {os.environ['N2C_API_KEY']}"},
    }
})
tools = await client.get_tools()`,
        },
      ],
    },
    docsUrl: "https://github.com/langchain-ai/langchain-mcp-adapters",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "google-adk",
    label: "Google ADK",
    category: "sdk",
    summary: "Agent Development Kit's McpToolset.",
    setup: {
      token: (ctx) => [
        {
          kind: "code",
          label: "Python",
          language: "python",
          code: `import os
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams
from google.adk.tools.mcp_tool.mcp_toolset import McpToolset

nodes2cloud = McpToolset(
    connection_params=StreamableHTTPConnectionParams(
        url="${ctx.url}",
        headers={"Authorization": f"Bearer {os.environ['N2C_API_KEY']}"},
    ),
)
# Pass tools=[nodes2cloud] to your Agent.`,
        },
      ],
    },
    docsUrl: "https://adk.dev/tools-custom/mcp-tools/",
    verification: { confidence: "high", checked: CHECKED },
  },
  {
    id: "cloudflare-agents",
    label: "Cloudflare Agents SDK",
    category: "sdk",
    summary: "`addMcpServer` inside an Agent.",
    setup: {
      token: (ctx) => [
        {
          kind: "code",
          label: "TypeScript",
          language: "typescript",
          code: `// Inside your Agent class
await this.addMcpServer("${ctx.name}", "${ctx.url}", {
  transport: {
    type: "streamable-http",
    headers: { Authorization: \`Bearer \${this.env.N2C_API_KEY}\` },
  },
});
const tools = this.mcp.getAITools();`,
        },
      ],
    },
    notes: ["Leave out `headers` and the SDK runs the OAuth flow, returning an `authUrl`."],
    docsUrl: "https://developers.cloudflare.com/agents/api-reference/mcp-client-api/",
    verification: { confidence: "high", checked: CHECKED },
  },
];
