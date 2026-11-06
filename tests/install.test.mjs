import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import {
  parseConfigFile,
  resolveConfigPath,
  setAtKeyPath,
  stripJsonComments,
  updateCodexToml,
  updateTomlTable,
} from "../dist/install.js";

const scriptPath = path.resolve("dist/index.js");

/**
 * Runs `n2c-mcp install …` with stdin empty, so a stray prompt answers "" instead
 * of blocking, and without any token from the caller's environment.
 */
function runInstall(args, { home, cwd } = {}) {
  const env = { ...process.env };
  delete env.N2C_API_KEY;
  delete env.N2C_SESSION_TOKEN;
  if (home) {
    env.HOME = home;
    env.USERPROFILE = home;
    env.APPDATA = path.join(home, "AppData", "Roaming");
  }
  const result = spawnSync(process.execPath, [scriptPath, "install", ...args], {
    encoding: "utf-8",
    input: "",
    env,
    cwd: cwd ?? process.cwd(),
    timeout: 15_000,
  });
  return { status: result.status, out: result.stdout, err: result.stderr };
}

function tempHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "n2c-mcp-install-"));
}

describe("mcp-cli installer helpers", () => {
  it("stripJsonComments preserves strings with slashes and URLs while removing comments and trailing commas", () => {
    const jsonc = `{
      // Header comment
      "url": "https://api.nodes2cloud.com/mcp", /* inline block */
      "path": "/some/unix/path",
      "items": [1, 2, ],
    }`;
    const cleaned = stripJsonComments(jsonc);
    const parsed = JSON.parse(cleaned);
    assert.deepEqual(parsed, {
      url: "https://api.nodes2cloud.com/mcp",
      path: "/some/unix/path",
      items: [1, 2],
    });
  });

  it("parseConfigFile safely handles empty (0-byte) files without crashing", () => {
    const res = parseConfigFile("", "/tmp/test.json");
    assert.deepEqual(res, {});

    const resWhitespace = parseConfigFile("   \n\t  ", "/tmp/test.json");
    assert.deepEqual(resWhitespace, {});
  });

  it("parseConfigFile safely parses JSONC files with comments", () => {
    const jsonc = `{
      // user configuration
      "existing": true,
    }`;
    const res = parseConfigFile(jsonc, "/tmp/test.json");
    assert.deepEqual(res, { existing: true });
  });

  it("parseConfigFile throws descriptive error for corrupted JSON", () => {
    assert.throws(
      () => parseConfigFile("{ unquoted: key }", "/tmp/test.json"),
      /Error parsing existing config file at \/tmp\/test\.json/,
    );
  });

  it("updateCodexToml appends block if not present", () => {
    const original = `[general]\ntheme = "dark"\n`;
    const block = `[mcp_servers.nodes2cloud]\ncommand = "npx"\nargs = ["-y", "n2c-mcp"]\n[mcp_servers.nodes2cloud.env]\nN2C_API_KEY = "pat_123"\n`;
    const updated = updateCodexToml(original, block);
    assert.ok(updated.includes(`[mcp_servers.nodes2cloud]`));
    assert.ok(updated.includes(`theme = "dark"`));
    assert.equal((updated.match(/\[mcp_servers\.nodes2cloud\]/g) || []).length, 1);
  });

  it("updateCodexToml replaces existing table on re-run without duplicate tables", () => {
    const original = `[general]
theme = "dark"

[mcp_servers.nodes2cloud]
command = "npx"
args = ["-y", "n2c-mcp"]
[mcp_servers.nodes2cloud.env]
N2C_API_KEY = "old_pat"

[other_section]
key = "val"
`;
    const newBlock = `[mcp_servers.nodes2cloud]
command = "npx"
args = ["-y", "n2c-mcp"]
[mcp_servers.nodes2cloud.env]
N2C_API_KEY = "new_pat"
`;
    const updated = updateCodexToml(original, newBlock);
    assert.equal((updated.match(/\[mcp_servers\.nodes2cloud\]/g) || []).length, 1);
    assert.ok(updated.includes(`N2C_API_KEY = "new_pat"`));
    assert.ok(!updated.includes(`old_pat`));
    assert.ok(updated.includes(`[other_section]`));
  });

  it("updateTomlTable leaves similarly named tables alone", () => {
    const original = `[mcp_servers.nodes2cloud]\nurl = "old"\n\n[mcp_servers.nodes2cloud2]\nurl = "keep"\n`;
    const updated = updateTomlTable(
      original,
      "mcp_servers.nodes2cloud",
      `[mcp_servers.nodes2cloud]\nurl = "new"`,
    );
    assert.equal(
      updated,
      `[mcp_servers.nodes2cloud]\nurl = "new"\n\n[mcp_servers.nodes2cloud2]\nurl = "keep"\n`,
    );
  });

  it("setAtKeyPath treats each key path element as one literal key", () => {
    const config = { "amp.mcpServers": { other: { url: "x" } }, theme: "dark" };
    setAtKeyPath(config, ["amp.mcpServers", "nodes2cloud"], { url: "y" });
    assert.deepEqual(config, {
      "amp.mcpServers": { other: { url: "x" }, nodes2cloud: { url: "y" } },
      theme: "dark",
    });
    const empty = setAtKeyPath({ servers: "not an object" }, ["servers", "nodes2cloud"], 1);
    assert.deepEqual(empty, { servers: { nodes2cloud: 1 } });
  });

  it("resolveConfigPath expands ~, %APPDATA%, %USERPROFILE% and relative paths", () => {
    const ctx = { home: "/home/me", cwd: "/work/proj", appData: "/appdata" };
    assert.equal(
      resolveConfigPath("~/.kiro/settings/mcp.json", ctx),
      path.join("/home/me", ".kiro", "settings", "mcp.json"),
    );
    assert.equal(
      resolveConfigPath("%APPDATA%\\Claude\\x.json", ctx),
      path.join("/appdata", "Claude", "x.json"),
    );
    assert.equal(
      resolveConfigPath("%APPDATA%\\Claude\\x.json", { home: "/home/me", cwd: "/" }),
      path.join("/home/me", "AppData", "Roaming", "Claude", "x.json"),
    );
    assert.equal(
      resolveConfigPath("%USERPROFILE%\\.mcp.json", ctx),
      path.join("/home/me", ".mcp.json"),
    );
    assert.equal(
      resolveConfigPath(".cursor/mcp.json", ctx),
      path.resolve("/work/proj", ".cursor", "mcp.json"),
    );
  });
});

describe("n2c-mcp install CLI", () => {
  it("--client 11 prints the generic proxy config with the trimmed token", () => {
    const { status, out } = runInstall(["--key", "  n2c_pat_trimtest123  ", "--client", "11"]);
    assert.equal(status, 0);
    assert.ok(out.includes("n2c_pat_trimtest123"));
    assert.ok(!out.includes("  n2c_pat_trimtest123  "));
    assert.ok(out.includes('"mcpServers"'));
    assert.ok(out.includes('"command"'));
  });

  it("prints Zed context_servers with the token in headers for client 6", () => {
    const { status, out } = runInstall(["--key", "n2c_pat_zedtest", "--client", "6", "--print"]);
    assert.equal(status, 0);
    assert.ok(out.includes('"context_servers"'));
    assert.ok(out.includes('"headers"'));
    assert.ok(out.includes("Bearer n2c_pat_zedtest"));
  });

  it("prints VS Code servers over http for client 8", () => {
    const { status, out } = runInstall(["--key", "n2c_pat_vscodetest", "--client", "8", "--print"]);
    assert.equal(status, 0);
    assert.ok(out.includes('"servers"'));
    assert.ok(out.includes('"type": "http"'));
    assert.ok(!out.includes('"type": "stdio"'));
    assert.ok(out.includes("n2c_pat_vscodetest"));
  });

  it("prints OpenCode remote mcp for client 10", () => {
    const { status, out } = runInstall([
      "--key",
      "n2c_pat_opencodetest",
      "--client",
      "10",
      "--print",
    ]);
    assert.equal(status, 0);
    assert.ok(out.includes('"mcp": {'));
    assert.ok(out.includes('"type": "remote"'));
    assert.ok(out.includes("n2c_pat_opencodetest"));
  });

  it("--client kiro --print uses OAuth: prints the url and never asks for a token", () => {
    const { status, out } = runInstall(["--client", "kiro", "--print"]);
    assert.equal(status, 0);
    assert.ok(out.includes("https://api.nodes2cloud.com/mcp"));
    assert.ok(!out.includes("Enter your Nodes2Cloud Personal Access Token"));
    assert.ok(!out.includes("n2c_pat_"));
  });

  it("--env staging points the config at the staging endpoint", () => {
    const { status, out } = runInstall(["--client", "kiro", "--env", "staging", "--print"]);
    assert.equal(status, 0);
    assert.ok(out.includes("https://api-staging.nodes2cloud.com/mcp"));
  });

  it("resolves the windsurf alias to Devin and prints its commands", () => {
    const { status, out } = runInstall(["--client", "windsurf"]);
    assert.equal(status, 0);
    assert.ok(out.includes("Devin Desktop"));
    assert.ok(out.includes("devin mcp add -s user nodes2cloud https://api.nodes2cloud.com/mcp"));
    assert.ok(out.includes("devin mcp login nodes2cloud"));
  });

  it("rejects an unknown client", () => {
    const { status, err } = runInstall(["--client", "not-a-client", "--print"]);
    assert.equal(status, 1);
    assert.ok(err.includes("Unknown client"));
  });

  it("--client 1 without a token fails instead of waiting on stdin", () => {
    const { status, err } = runInstall(["--client", "1", "--print"]);
    assert.equal(status, 1);
    assert.ok(err.includes("Must start with n2c_pat_"));
  });

  it("--list includes listed clients and leaves low-confidence ones out", () => {
    const { status, out } = runInstall(["--list"]);
    assert.equal(status, 0);
    for (const id of ["kiro", "antigravity", "codex", "claude-code"]) {
      assert.match(out, new RegExp(`^  ${id}\\s`, "m"), `${id} is listed`);
    }
    for (const id of ["trae", "windsurf-cascade", "crush"]) {
      assert.doesNotMatch(out, new RegExp(`^  ${id}\\s`, "m"), `${id} is hidden`);
    }
  });

  it("--client kiro merges into an existing ~/.kiro/settings/mcp.json", () => {
    const home = tempHome();
    try {
      const file = path.join(home, ".kiro", "settings", "mcp.json");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        `{\n  // mine\n  "mcpServers": { "other": { "command": "other-server" } },\n  "theme": "dark"\n}\n`,
      );
      const { status, out } = runInstall(["--client", "kiro"], { home, cwd: home });
      assert.equal(status, 0, out);
      assert.ok(out.includes(file));
      assert.ok(out.includes("approve the browser sign-in"));
      const written = JSON.parse(fs.readFileSync(file, "utf-8"));
      assert.deepEqual(written, {
        mcpServers: {
          other: { command: "other-server" },
          nodes2cloud: { url: "https://api.nodes2cloud.com/mcp" },
        },
        theme: "dark",
      });
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it("--client codex --key writes [mcp_servers.nodes2cloud] once, replacing the old table", () => {
    const home = tempHome();
    try {
      const file = path.join(home, ".codex", "config.toml");
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(
        file,
        `model = "gpt-5"

[mcp_servers.nodes2cloud]
command = "npx"
args = ["-y", "n2c-mcp"]
[mcp_servers.nodes2cloud.env]
N2C_API_KEY = "n2c_pat_old"

[mcp_servers.other]
command = "other"
`,
      );
      for (let run = 0; run < 2; run++) {
        const { status, out } = runInstall(["--client", "codex", "--key", "n2c_pat_codextest"], {
          home,
          cwd: home,
        });
        assert.equal(status, 0, out);
      }
      const written = fs.readFileSync(file, "utf-8");
      assert.equal((written.match(/^\[mcp_servers\.nodes2cloud\]$/gm) || []).length, 1);
      assert.ok(written.includes(`url = "https://api.nodes2cloud.com/mcp"`));
      assert.ok(written.includes(`Authorization = "Bearer n2c_pat_codextest"`));
      assert.ok(!written.includes("n2c_pat_old"));
      assert.ok(!written.includes("[mcp_servers.nodes2cloud.env]"));
      assert.ok(written.includes(`model = "gpt-5"`));
      assert.ok(written.includes("[mcp_servers.other]"));
      if (process.platform !== "win32") {
        assert.equal(fs.statSync(file).mode & 0o777, 0o600);
      }
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });

  it("--client 4 writes the project's .cursor/mcp.json", () => {
    const home = tempHome();
    try {
      const { status, out } = runInstall(["--client", "4", "--key", "n2c_pat_cursortest"], {
        home,
        cwd: home,
      });
      assert.equal(status, 0, out);
      const file = path.join(fs.realpathSync(home), ".cursor", "mcp.json");
      const written = JSON.parse(fs.readFileSync(file, "utf-8"));
      assert.equal(
        written.mcpServers.nodes2cloud.headers.Authorization,
        "Bearer n2c_pat_cursortest",
      );
    } finally {
      fs.rmSync(home, { recursive: true, force: true });
    }
  });
});

describe("token safety (L14)", () => {
  function gitRepo() {
    const dir = tempHome();
    spawnSync("git", ["init", "-q"], { cwd: dir });
    return dir;
  }

  it("refuses to write a token into a project file git would commit, writing nothing", () => {
    const dir = gitRepo();
    try {
      const { status, err } = runInstall(["--client", "4", "--key", "n2c_pat_leaktest"], {
        home: dir,
        cwd: dir,
      });
      assert.equal(status, 1);
      assert.match(err, /could be committed/);
      assert.match(err, /\.gitignore/);
      assert.ok(!fs.existsSync(path.join(dir, ".cursor", "mcp.json")));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("writes it once git ignores the file, or with --allow-project-token", () => {
    const ignored = gitRepo();
    const forced = gitRepo();
    try {
      fs.writeFileSync(path.join(ignored, ".gitignore"), ".cursor/\n");
      const a = runInstall(["--client", "4", "--key", "n2c_pat_ignoredtest"], {
        home: ignored,
        cwd: ignored,
      });
      assert.equal(a.status, 0, a.err);
      assert.ok(fs.existsSync(path.join(ignored, ".cursor", "mcp.json")));

      const b = runInstall(
        ["--client", "4", "--key", "n2c_pat_forcedtest", "--allow-project-token"],
        { home: forced, cwd: forced },
      );
      assert.equal(b.status, 0, b.err);
      assert.ok(fs.existsSync(path.join(forced, ".cursor", "mcp.json")));
    } finally {
      fs.rmSync(ignored, { recursive: true, force: true });
      fs.rmSync(forced, { recursive: true, force: true });
    }
  });

  it("warns that a token on the command line stays in shell history", () => {
    const { status, out } = runInstall(["--key", "n2c_pat_argvtest", "--client", "11"]);
    assert.equal(status, 0);
    assert.match(out, /shell history/);
  });

  it("refuses a non-https endpoint except for localhost", () => {
    const bad = runInstall(["--client", "kiro", "--print", "--endpoint", "http://example.com/mcp"]);
    assert.equal(bad.status, 1);
    assert.match(bad.err, /not https/);
    const local = runInstall([
      "--client",
      "kiro",
      "--print",
      "--endpoint",
      "http://localhost:8787/mcp",
    ]);
    assert.equal(local.status, 0, local.err);
  });

  it("no longer reads N2C_SESSION_TOKEN as a token", () => {
    const env = { ...process.env, N2C_SESSION_TOKEN: "n2c_pat_sessiontest" };
    delete env.N2C_API_KEY;
    const result = spawnSync(process.execPath, [scriptPath, "install", "--client", "11"], {
      encoding: "utf-8",
      input: "",
      env,
      timeout: 15_000,
    });
    assert.equal(result.status, 1);
    assert.match(result.stdout, /N2C_SESSION_TOKEN is no longer supported/);
    assert.ok(!result.stdout.includes("n2c_pat_sessiontest"));
  });
});

describe("endpointProblem", () => {
  it("accepts https and loopback http, refuses the rest", async () => {
    const { endpointProblem, isNodes2CloudHost } = await import("../dist/security.js");
    assert.equal(endpointProblem("https://api.nodes2cloud.com/mcp"), undefined);
    assert.equal(endpointProblem("http://localhost:8787/mcp"), undefined);
    assert.equal(endpointProblem("http://127.0.0.1:9/mcp"), undefined);
    assert.equal(endpointProblem("http://[::1]:9/mcp"), undefined);
    assert.ok(endpointProblem("http://api.nodes2cloud.com/mcp"));
    assert.ok(endpointProblem("http://localhost.evil.com/mcp"));
    assert.ok(endpointProblem("ftp://x/mcp"));
    assert.ok(endpointProblem("not a url"));
    assert.equal(isNodes2CloudHost("https://api-staging.nodes2cloud.com/mcp"), true);
    assert.equal(isNodes2CloudHost("https://nodes2cloud.com.evil.com/mcp"), false);
  });
});
