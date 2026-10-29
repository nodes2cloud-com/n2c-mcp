# Nodes2Cloud MCP server

[![Nodes2Cloud MCP connector – tool definition quality and endpoint health on Glama](https://glama.ai/mcp/connectors/com.nodes2cloud/mcp/badges/score.svg)](https://glama.ai/mcp/connectors/com.nodes2cloud/mcp)

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

### The installer

```bash
npx -y n2c-mcp@latest install                    # pick a client from a menu
npx -y n2c-mcp@latest install --client kiro      # or name it
npx -y n2c-mcp@latest install --list             # every client id
```

For clients that can sign in through the browser (Kiro, Cursor, VS Code, Antigravity, Zed, Codex, OpenCode and more), the installer writes the remote server's URL into the client's config file and asks for no token: approve the sign-in when the client connects. Pass `--key <PAT>` to use a Personal Access Token instead. Clients that are set up with their own command (Claude Code, Devin, Gemini CLI…) or in an app's settings (Claude, ChatGPT…) get their exact steps printed instead.

| Flag | Meaning |
|---|---|
| `--client`, `-c` | Client id or alias, e.g. `kiro`, `cursor`, `vscode`, `codex`, `claude-code`. See `--list`. The numbers 1–11 from earlier versions still work. |
| `--list` | List the client ids, and which ones get a config file written vs. printed steps |
| `--key`, `--token` | Personal Access Token. Falls back to `N2C_API_KEY`, then a prompt that doesn't echo. Prefer those two: a token on the command line stays in your shell history. Without one, clients that support OAuth sign in through the browser. |
| `--env` | `production` (default), `staging` or `local` |
| `--endpoint` | A custom MCP endpoint URL |
| `--scope` | `user` or `project`: which config file to write. Default: the user file if the client has one, else the project's. |
| `--allow-project-token` | Write a token into a project config file that git doesn't ignore. Refused by default, since that file could be committed. |
| `--print`, `--dry-run` | Print the setup steps without writing any file |

The installer merges into an existing config file and keeps your other servers. When it writes a token, the file is restricted to your user.

### stdio clients and CI: this package with a Personal Access Token

1. In Nodes2Cloud, open **Integrations → MCP server → Headless & CI Tokens** and create a token (`n2c_pat_…`). It is shown once.
2. Run the installer, e.g. `npx -y n2c-mcp@latest install --client claude` for Claude Desktop (its config file only runs local servers), and paste the token at the prompt (or set `N2C_API_KEY` first). Or configure a client by hand:

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

With a token, the installer writes it into the client's config file in plain text and restricts the file to your user. It won't write a token into a project file that git would commit: add the file to `.gitignore`, use `--scope user`, or sign in with OAuth instead. Revoke the token from the same screen when you no longer need it, and create it with the narrowest access that works (e.g. Read only). `--client 11` prints the generic stdio entry above with your token filled in.

### Environment

| Variable | |
|---|---|
| `N2C_API_KEY` | Personal Access Token. Without it, the server runs in **preview mode**: it lists its tools, prompts and resource templates from the public server card, and every tool call returns setup instructions instead of doing anything. |
| `N2C_MCP_ENDPOINT` | Remote endpoint, `https://` only (`http://` only for localhost). Default `https://api.nodes2cloud.com/mcp`. |

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
