import assert from "node:assert/strict";
import * as path from "node:path";
import { describe, it } from "node:test";
import { parseConfigFile, stripJsonComments, updateCodexToml } from "../dist/install.js";

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

  it("handles CLI flags non-interactively with leading spaces trimmed in PAT", async () => {
    const { execSync } = await import("node:child_process");
    const scriptPath = path.resolve("dist/index.js");
    const out = execSync(
      `node "${scriptPath}" install --key "  n2c_pat_trimtest123  " --client 11`,
      { encoding: "utf-8" },
    );
    assert.ok(out.includes("n2c_pat_trimtest123"));
    assert.ok(!out.includes("  n2c_pat_trimtest123  "));
    assert.ok(out.includes("mcpServers"));
  });

  it("prints Zed context_servers format for client 6", async () => {
    const { execSync } = await import("node:child_process");
    const scriptPath = path.resolve("dist/index.js");
    const out = execSync(`node "${scriptPath}" install --key n2c_pat_zedtest --client 6 --print`, {
      encoding: "utf-8",
    });
    assert.ok(out.includes("context_servers"));
    assert.ok(out.includes("n2c_pat_zedtest"));
  });

  it("prints VS Code servers format for client 8", async () => {
    const { execSync } = await import("node:child_process");
    const scriptPath = path.resolve("dist/index.js");
    const out = execSync(
      `node "${scriptPath}" install --key n2c_pat_vscodetest --client 8 --print`,
      { encoding: "utf-8" },
    );
    assert.ok(out.includes("servers"));
    assert.ok(out.includes('"type": "stdio"'));
    assert.ok(out.includes("n2c_pat_vscodetest"));
  });

  it("prints OpenCode mcp format for client 10", async () => {
    const { execSync } = await import("node:child_process");
    const scriptPath = path.resolve("dist/index.js");
    const out = execSync(
      `node "${scriptPath}" install --key n2c_pat_opencodetest --client 10 --print`,
      { encoding: "utf-8" },
    );
    assert.ok(out.includes('"mcp": {'));
    assert.ok(out.includes('"type": "local"'));
    assert.ok(out.includes("n2c_pat_opencodetest"));
  });
});
