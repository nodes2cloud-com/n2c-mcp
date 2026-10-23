import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { parseResponseBody } from "../dist/proxy.js";
import { CLI_VERSION } from "../dist/version.js";

const CLI = path.resolve("dist/index.js");

/**
 * A stand-in for the remote server. Each test sets `handler` to decide how it
 * answers; every request it receives is recorded.
 */
let handler = (_req, res) => res.writeHead(500).end();
const received = [];
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    received.push({ url: req.url, headers: req.headers, body });
    handler(req, res, body);
  });
});
let endpoint;

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  endpoint = `http://127.0.0.1:${server.address().port}/mcp`;
});
after(() => {
  // Node 18's close() otherwise waits on the CLI's idle keep-alive sockets.
  server.closeAllConnections();
  server.close();
});

/** Runs the CLI with these stdin lines and collects stdout messages and stderr. */
function runCli(lines, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [CLI], {
      env: { PATH: process.env.PATH, N2C_MCP_ENDPOINT: endpoint, ...env },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
    });
    child.stderr.on("data", (d) => {
      stderr += d;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const messages = stdout
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line));
      resolve({ code, messages, stderr });
    });
    for (const line of lines) child.stdin.write(`${JSON.stringify(line)}\n`);
    child.stdin.end();
  });
}

const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "t", version: "1" },
  },
};
const toolsList = { jsonrpc: "2.0", id: 2, method: "tools/list" };

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
}

describe("with a token", () => {
  it("passes requests through with the bearer token and returns the server's answer", async () => {
    received.length = 0;
    handler = (_req, res, body) => {
      const { id } = JSON.parse(body);
      json(res, 200, { jsonrpc: "2.0", id, result: { tools: [{ name: "list_workflows" }] } });
    };
    const { messages } = await runCli([toolsList], { N2C_API_KEY: "n2c_pat_good" });
    assert.deepEqual(messages, [
      { jsonrpc: "2.0", id: 2, result: { tools: [{ name: "list_workflows" }] } },
    ]);
    assert.equal(received[0].headers.authorization, "Bearer n2c_pat_good");
    assert.match(received[0].headers["user-agent"], /^n2c-mcp\//);
  });

  it("sends the negotiated MCP-Protocol-Version on requests after initialize", async () => {
    received.length = 0;
    handler = (_req, res, body) => {
      const msg = JSON.parse(body);
      if (msg.method === "initialize") {
        json(res, 200, {
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            serverInfo: { name: "x", version: "1" },
          },
        });
      } else {
        json(res, 200, { jsonrpc: "2.0", id: msg.id, result: { tools: [] } });
      }
    };
    // Sequential, as clients do: initialize must be answered first.
    const child = spawn(process.execPath, [CLI], {
      env: { PATH: process.env.PATH, N2C_MCP_ENDPOINT: endpoint, N2C_API_KEY: "n2c_pat_good" },
    });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stdin.write(`${JSON.stringify(initialize)}\n`);
    await new Promise((resolve) => {
      const wait = setInterval(() => {
        if (out.includes('"id":1')) {
          clearInterval(wait);
          resolve();
        }
      }, 10);
    });
    child.stdin.write(`${JSON.stringify(toolsList)}\n`);
    child.stdin.end();
    await new Promise((resolve) => child.on("close", resolve));
    assert.equal(received[0].headers["mcp-protocol-version"], undefined);
    assert.equal(received[1].headers["mcp-protocol-version"], "2025-06-18");
  });

  it("reports a rejected token as an error on initialize, never as an empty server", async () => {
    handler = (_req, res) =>
      json(res, 401, {
        error: { code: "unauthorized", message: "A valid Bearer token is required." },
      });
    const { messages, stderr } = await runCli([initialize, toolsList], {
      N2C_API_KEY: "n2c_pat_bad",
    });
    assert.equal(messages.length, 2);
    for (const message of messages) {
      assert.equal(message.result, undefined, "no fabricated result");
      assert.equal(message.error.code, -32001);
      assert.match(message.error.message, /invalid, expired or revoked/);
      assert.equal(message.error.data.httpStatus, 401);
    }
    assert.match(stderr, /rejected the token/);
  });

  it("maps a plan refusal, a rate limit and an outage to their own errors", async () => {
    const cases = [
      [
        402,
        {
          error: {
            code: "mcp_requires_pro",
            message: "MCP access is not available on this plan.",
            remediation: "Upgrade at /billing.",
          },
        },
        -32002,
        /not available on this plan\. Upgrade/,
      ],
      [
        429,
        { error: { code: "rate_limited", message: "Too many MCP requests." } },
        -32003,
        /Too many requests/,
      ],
      [
        503,
        { error: { code: "feature_disabled", message: "The MCP server is temporarily disabled." } },
        -32004,
        /temporarily disabled/,
      ],
      [500, "<html>oops</html>", -32000, /HTTP 500/],
    ];
    for (const [status, body, code, pattern] of cases) {
      handler = (_req, res) =>
        typeof body === "string" ? res.writeHead(status).end(body) : json(res, status, body);
      const { messages } = await runCli([toolsList], { N2C_API_KEY: "n2c_pat_x" });
      assert.equal(messages[0].error.code, code, String(status));
      assert.match(messages[0].error.message, pattern, String(status));
    }
  });

  it("reports an unreachable endpoint clearly", async () => {
    const { messages } = await runCli([toolsList], {
      N2C_API_KEY: "n2c_pat_x",
      N2C_MCP_ENDPOINT: "http://127.0.0.1:9/mcp",
    });
    assert.equal(messages[0].error.code, -32005);
    assert.match(messages[0].error.message, /Could not reach/);
  });

  it("forwards every message of an SSE response, and nothing for a notification", async () => {
    handler = (_req, res, body) => {
      const msg = JSON.parse(body);
      if (msg.id === undefined) return res.writeHead(202).end();
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      res.end(
        `event: message\ndata: {"jsonrpc":"2.0","method":"notifications/progress","params":{"progress":1}}\n\n` +
          `event: message\ndata: {"jsonrpc":"2.0","id":${msg.id},\ndata: "result":{"ok":true}}\n\n`,
      );
    };
    const { messages } = await runCli(
      [{ jsonrpc: "2.0", method: "notifications/initialized" }, toolsList],
      { N2C_API_KEY: "n2c_pat_x" },
    );
    assert.deepEqual(messages, [
      { jsonrpc: "2.0", method: "notifications/progress", params: { progress: 1 } },
      { jsonrpc: "2.0", id: 2, result: { ok: true } },
    ]);
  });
});

describe("without a token (preview mode)", () => {
  it("lists the live server card's tools and refuses calls with setup instructions", async () => {
    received.length = 0;
    handler = (req, res) => {
      if (req.url === "/.well-known/mcp/server-card.json") {
        return json(res, 200, {
          serverInfo: { name: "nodes2cloud", version: "9.9.9" },
          instructions: "Live card.",
          tools: [{ name: "live_tool", inputSchema: { type: "object" } }],
          prompts: [{ name: "p" }],
          resourceTemplates: [],
        });
      }
      res.writeHead(500).end();
    };
    const { messages, stderr } = await runCli(
      [
        initialize,
        toolsList,
        {
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "live_tool", arguments: {} },
        },
        { jsonrpc: "2.0", id: 4, method: "prompts/list" },
      ],
      {},
    );
    const byId = Object.fromEntries(messages.map((m) => [m.id, m]));
    assert.equal(byId[1].result.protocolVersion, "2025-06-18");
    assert.equal(byId[1].result.serverInfo.version, "9.9.9");
    assert.deepEqual(
      byId[2].result.tools.map((t) => t.name),
      ["live_tool"],
    );
    assert.equal(byId[3].result.isError, true);
    assert.match(byId[3].result.content[0].text, /not connected yet/);
    assert.deepEqual(byId[4].result.prompts, [{ name: "p" }]);
    assert.match(stderr, /preview mode/);
    // Only the public card was fetched: no MCP request, so no token could be asked for.
    assert.deepEqual(
      received.map((r) => r.url),
      ["/.well-known/mcp/server-card.json"],
    );
    assert.equal(received[0].headers.authorization, undefined);
  });

  it("falls back to the bundled card when the endpoint is unreachable", async () => {
    const { messages, stderr } = await runCli([toolsList], {
      N2C_MCP_ENDPOINT: "http://127.0.0.1:9/mcp",
    });
    const names = messages[0].result.tools.map((t) => t.name);
    assert.ok(names.includes("deploy_workflow"));
    assert.ok(names.includes("validate_workflow"));
    assert.match(stderr, /bundled server card/);
  });
});

describe("packaging", () => {
  it("reports the same version as package.json", () => {
    const pkg = JSON.parse(readFileSync(path.resolve("package.json"), "utf-8"));
    assert.equal(CLI_VERSION, pkg.version);
  });

  it("parses plain JSON, batches and multi-line SSE events", () => {
    assert.deepEqual(parseResponseBody('{"id":1}', "application/json"), [{ id: 1 }]);
    assert.deepEqual(parseResponseBody('[{"id":1},{"id":2}]', "application/json"), [
      { id: 1 },
      { id: 2 },
    ]);
    assert.deepEqual(
      parseResponseBody(
        ': keep-alive\n\ndata: {"id":1}\n\ndata: {"id":\ndata: 2}\n\n',
        "text/event-stream",
      ),
      [{ id: 1 }, { id: 2 }],
    );
    assert.deepEqual(parseResponseBody("", "application/json"), []);
  });
});
