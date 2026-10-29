# Installing the Nodes2Cloud MCP server (for AI agents)

Nodes2Cloud is a hosted MCP server. There is nothing to clone or build.

## Preferred: remote server with OAuth

If the client supports remote (Streamable HTTP) MCP servers, add:

```json
{ "mcpServers": { "nodes2cloud": { "url": "https://api.nodes2cloud.com/mcp" } } }
```

On first use the client opens a browser consent screen. The user approves it. No token is needed.

The installer knows each client's file and field names (they differ: `servers`, `mcpServers`, `context_servers`, `serverUrl`…). Run it with the client's id and it uses OAuth wherever the client supports it, without asking for a token:

```bash
npx -y n2c-mcp@latest install --client <id>          # e.g. kiro, cursor, vscode, codex, antigravity, zed
npx -y n2c-mcp@latest install --client <id> --print  # show the steps without writing a file
npx -y n2c-mcp@latest install --list                 # all client ids
```

For clients configured by their own command or settings screen (Claude Code, Devin, Gemini CLI, Claude, ChatGPT…), it prints the exact steps instead of writing a file.

## Otherwise: stdio with a Personal Access Token

1. Ask the user to create a token in Nodes2Cloud under **Integrations → MCP server → Headless & CI Tokens**. It starts with `n2c_pat_`. The user should enter it into the client's MCP settings themselves. Do not ask them to paste it into the chat.
2. Have the user run `npx -y n2c-mcp@latest install --client <id>` in their own terminal and paste the token at its prompt, or add this server entry:

```json
{
  "mcpServers": {
    "nodes2cloud": {
      "command": "npx",
      "args": ["-y", "n2c-mcp"],
      "env": { "N2C_API_KEY": "<the user's n2c_pat_ token>" }
    }
  }
}
```

Requirements: Node.js 18 or later.

## Check it works

Call `list_node_types`. It needs no account data. Then call `check_setup` to see whether the user's Cloudflare account is connected.

If tool calls answer "Nodes2Cloud is not connected yet", no token is set. If the client reports "rejected the token", the token is invalid or expired.

Docs: <https://docs.nodes2cloud.com/docs/getting-started/mcp>
