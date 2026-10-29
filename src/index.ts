#!/usr/bin/env node

import * as readline from "node:readline";
import { loadServerCard, previewNotice, previewResponse } from "./preview.js";
import { createProxy } from "./proxy.js";
import { endpointProblem, isNodes2CloudHost } from "./security.js";
import type { JsonRpcRequest } from "./types.js";
import { CLI_VERSION, DEFAULT_ENDPOINT, DOCS_URL } from "./version.js";

const HELP = `n2c-mcp ${CLI_VERSION} — Nodes2Cloud MCP server for stdio clients

Usage:
  npx -y n2c-mcp              Run the MCP server over stdio (what MCP clients launch)
  npx -y n2c-mcp install      Add the server to an MCP client (interactive menu)
  npx -y n2c-mcp --version    Print the version
  npx -y n2c-mcp --help       Print this help

Install options:
  --client, -c <id>           Client id or alias, e.g. kiro, cursor, codex, vscode
                              (the numbers 1-11 from earlier versions still work)
  --list                      List the client ids and whether install writes a file
  --token, --key <pat>        Use a Personal Access Token (default: N2C_API_KEY, or
                              a prompt). Prefer the variable or the prompt: a token
                              on the command line stays in your shell history.
                              Without one, clients that support it sign in through
                              the browser (OAuth).
  --env <name>                production (default), staging or local
  --endpoint <url>            A custom MCP endpoint URL
  --scope user|project        Which config file to write. Default: user if the
                              client has one, else the current project.
  --print, --dry-run          Print the setup steps without writing any file
  --allow-project-token       Write a token into a project config file even though
                              git does not ignore it (refused by default)

Environment:
  N2C_API_KEY        Personal Access Token (n2c_pat_…). Without it the server runs
                     in preview mode: it lists its tools but cannot call them.
  N2C_MCP_ENDPOINT   Remote endpoint, https only (http only for localhost).
                     Default: ${DEFAULT_ENDPOINT}

Clients that support remote MCP servers can skip this package and connect to
${DEFAULT_ENDPOINT} directly, signing in with OAuth.

Docs: ${DOCS_URL}
`;

/** Protocol traffic only: one JSON-RPC message per line. */
function send(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

/** Anything for a human goes to stderr, which MCP clients show as server logs. */
function log(line: string): void {
  process.stderr.write(`${line}\n`);
}

/** Reads stdin line by line, and exits once it closes and every request has answered. */
function serve(handle: (line: string) => Promise<void>): void {
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  let active = 0;
  let closed = false;
  const maybeExit = () => {
    // Exit only once stdout has flushed: a piped stdout is asynchronous, and
    // `process.exit` would otherwise cut off a large answer (the tool list).
    if (closed && active === 0) process.stdout.write("", () => process.exit(0));
  };
  rl.on("line", (line) => {
    active++;
    handle(line)
      .catch((err: unknown) => log(`n2c-mcp: ${err instanceof Error ? err.message : String(err)}`))
      .finally(() => {
        active--;
        maybeExit();
      });
  });
  rl.on("close", () => {
    closed = true;
    maybeExit();
  });
}

function runPreview(endpoint: string): void {
  const cardPromise = loadServerCard(endpoint).then((loaded) => {
    log(previewNotice(loaded.source));
    return loaded.card;
  });
  serve(async (line) => {
    if (!line.trim()) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error." } });
      return;
    }
    const card = await cardPromise;
    for (const message of Array.isArray(parsed) ? parsed : [parsed]) {
      const response = previewResponse(card, message as JsonRpcRequest);
      if (response !== undefined) send(response);
    }
  });
}

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  process.stdout.write(HELP);
} else if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write(`${CLI_VERSION}\n`);
} else if (args[0] === "install" || args[0] === "setup") {
  import("./install.js")
    .then((m) => m.runInstall())
    .catch((err: unknown) => {
      log(`Failed to load the installer: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    });
} else {
  const apiKey = (process.env.N2C_API_KEY || "").trim();
  const endpoint = process.env.N2C_MCP_ENDPOINT || DEFAULT_ENDPOINT;
  if (!apiKey && process.env.N2C_SESSION_TOKEN) {
    // Nodes2Cloud no longer accepts a browser session as an MCP credential.
    log(
      "n2c-mcp: N2C_SESSION_TOKEN is no longer supported. Create a Personal Access Token in Nodes2Cloud (Integrations → Headless & CI Tokens) and set it as N2C_API_KEY.",
    );
  }
  const problem = apiKey ? endpointProblem(endpoint) : undefined;
  if (problem) {
    log(`n2c-mcp: refusing to send your token: N2C_MCP_ENDPOINT ${problem}`);
    process.exit(1);
  } else if (!apiKey) {
    runPreview(endpoint);
  } else {
    if (!isNodes2CloudHost(endpoint)) {
      log(`n2c-mcp: sending your token to ${endpoint}, which is not a Nodes2Cloud host.`);
    }
    const proxy = createProxy({ endpoint, apiKey, send, log });
    serve((line) => proxy.handleLine(line));
  }
}
