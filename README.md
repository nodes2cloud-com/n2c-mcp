# Nodes2Cloud MCP server

[Nodes2Cloud](https://nodes2cloud.com) lets coding agents (Claude Code, Cursor, VS Code, Windsurf, Zed and other [MCP](https://modelcontextprotocol.io) clients) build automation workflows, validate them, and deploy them as Cloudflare Workers in **your own** Cloudflare account. The server recompiles every deploy itself, and by default each agent deploy waits for you to approve it in the browser.

This package, `n2c-mcp`, is the **stdio** entry point: a small local process that forwards MCP messages over HTTPS to the hosted server. It has no runtime dependencies. If your client supports remote MCP servers, you don't need it at all.

- Remote endpoint: `https://api.nodes2cloud.com/mcp` (Streamable HTTP, OAuth 2.1)
- Docs: <https://docs.nodes2cloud.com/docs/getting-started/mcp>
- Public tool list: <https://api.nodes2cloud.com/.well-known/mcp/server-card.json>

## Connect

### Recommended: remote server with OAuth

No token to copy. The first connection opens a consent screen in your browser that lists what the agent may do.

```bash
claude mcp add --transport http nodes2cloud https://api.nodes2cloud.com/mcp
```

Cursor (`.cursor/mcp.json`) and Claude Desktop:

```json
{ "mcpServers": { "nodes2cloud": { "url": "https://api.nodes2cloud.com/mcp" } } }
```

VS Code (`.vscode/mcp.json`):

```json
{ "servers": { "nodes2cloud": { "type": "http", "url": "https://api.nodes2cloud.com/mcp" } } }
```

### stdio clients and CI: this package with a Personal Access Token

1. In Nodes2Cloud, open **Integrations → MCP server → Headless & CI Tokens** and create a token (`n2c_pat_…`). It is shown once.
2. Run the installer and pick your client:

   ```bash
   npx -y n2c-mcp@latest install
   ```

   Or configure a client by hand:

   ```json
   {
     "mcpServers": {
       "nodes2cloud": {
         "command": "npx",
         "args": ["-y", "n2c-mcp"],
         "env": { "N2C_API_KEY": "<YOUR_N2C_PERSONAL_ACCESS_TOKEN>" }
       }
     }
   }
   ```

The installer writes the token into the client's config file in plain text and restricts the file to your user. Keep that file out of version control, and revoke the token from the same screen when you no longer need it.

Non-interactive install: `npx -y n2c-mcp@latest install --key <PAT> --client <1-11> [--print]`.

| Flag | Meaning |
|---|---|
| `--key`, `--token` | Personal Access Token. Falls back to `N2C_API_KEY`. |
| `--client`, `-c` | 1 Claude Desktop, 2 Claude Code, 3 Antigravity, 4 Cursor (project), 5 Windsurf, 6 Zed, 7 Codex, 8 VS Code (global), 9 VS Code (workspace), 10 OpenCode, 11 print only |
| `--env` | `production` (default), `staging` or `local` |
| `--endpoint` | A custom MCP endpoint URL |
| `--print`, `--dry-run` | Print the configuration without writing any file |

### Environment

| Variable | |
|---|---|
| `N2C_API_KEY` | Personal Access Token. Without it, the server runs in **preview mode**: it lists its tools, prompts and resource templates from the public server card, and every tool call returns setup instructions instead of doing anything. |
| `N2C_MCP_ENDPOINT` | Remote endpoint. Default `https://api.nodes2cloud.com/mcp`. |

`npx -y n2c-mcp --help` and `--version` are also available.

## What an agent can do

The server provides 28 tools, plus one tool per workflow you deploy with an **MCP Tool** trigger:

- **Author:** search the node catalogue and read exact node schemas; create, update, validate (optionally returning the compiled Worker code) and archive workflows.
- **Set up:** check what a deploy still needs, send you one link to connect missing services (agents never handle your secrets), and verify a saved connection.
- **Deploy:** deploy, list versions, read any version's graph, and roll back. Each deploy is recompiled on the server from the saved graph.
- **Run and observe:** run a deployed workflow; list and inspect runs; pause, resume, terminate or send an event to a durable run; read deployment status (telemetry, Cloudflare's own invocation counts, drift) and logs.
- **Use your workflows as tools:** call any workflow you deployed with an MCP Tool trigger.

The full list, with every argument schema, is in the [docs](https://docs.nodes2cloud.com/docs/getting-started/mcp) and the [server card](https://api.nodes2cloud.com/.well-known/mcp/server-card.json).

## Security

- **No deploy bypass.** Agents can only send workflow graph JSON. Every deploy recompiles that saved graph on the server, exactly like the editor's Deploy button.
- **Approval by default.** Unless you choose otherwise on the **Connected agents** screen, each agent deploy waits for you to approve it in an open Nodes2Cloud tab. You can also turn deploys off for a connection, limit it to specific workflows, and set daily limits.
- **Scoped access.** OAuth connections get only the permissions you approve. A Personal Access Token carries your account's default agent policy.
- **Secrets stay put.** Credentials are encrypted at rest and deployed as Worker secrets in your Cloudflare account. No tool returns a secret.
- **This package** forwards messages and nothing else. It sends your token only to the endpoint you configure (HTTPS by default) and never writes to disk, except when you run `install`.

Report a vulnerability to [security@nodes2cloud.com](mailto:security@nodes2cloud.com). See [SECURITY.md](./SECURITY.md) where available.

## Privacy Policy

The full policy is at <https://nodes2cloud.com/privacy>. In short, for this MCP server:

- **Data collected.** Your account identity, the workflow graphs and names agents create, and which tool was called, when, how long it took, its result code and the client's self-reported name. Tool arguments and results are not logged.
- **Use and storage.** Workflow graphs and versions are stored to provide the service. Run data and logs from your deployed workflows stay in **your** Cloudflare account and are read on demand, not stored by Nodes2Cloud.
- **Third-party sharing.** Deployed workflows call the services you connect, using your credentials, from your Cloudflare account. Nodes2Cloud's sub-processors are listed at <https://nodes2cloud.com/sub-processors>.
- **Retention.** Account data is kept while your account is active and deleted when you delete the account, as described in the policy.
- **Contact.** [privacy@nodes2cloud.com](mailto:privacy@nodes2cloud.com).

This package itself collects nothing. It sends a `User-Agent` of `n2c-mcp/<version>` with each request.

## Support

[support@nodes2cloud.com](mailto:support@nodes2cloud.com) · [Issues](https://github.com/nodes2cloud-com/n2c-mcp/issues)

## License

[Apache License 2.0](./LICENSE)
