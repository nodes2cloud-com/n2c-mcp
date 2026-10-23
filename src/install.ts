import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";

function getArg(flags: string[]): string | undefined {
  for (const flag of flags) {
    const idx = process.argv.indexOf(flag);
    if (idx !== -1 && process.argv.length > idx + 1) {
      return process.argv[idx + 1];
    }
  }
  return undefined;
}

/** Strips comments and trailing commas from JSON/JSONC text safely without touching quoted strings. */
export function stripJsonComments(str: string): string {
  return str
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*")|(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g,
      (match, stringGroup) => {
        return stringGroup ? match : "";
      },
    )
    .replace(/,(\s*[}\]])/g, "$1");
}

/** Safely parses existing configuration files (supports empty files and JSONC). */
export function parseConfigFile(content: string, filePath: string): Record<string, unknown> {
  const trimmed = content.trim();
  if (!trimmed) {
    return {};
  }
  const stripped = stripJsonComments(trimmed);
  try {
    const parsed = JSON.parse(stripped);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch (_e) {
    throw new Error(`Error parsing existing config file at ${filePath}. Overwriting is not safe.`);
  }
}

/** Updates or inserts the [mcp_servers.nodes2cloud] section in Codex TOML without duplicating tables. */
export function updateCodexToml(existing: string, newBlock: string): string {
  const regex = /\[mcp_servers\.nodes2cloud\][\s\S]*?(?=(\n\[(?!mcp_servers\.nodes2cloud\b))|$)/;
  if (regex.test(existing)) {
    return existing.replace(regex, newBlock.trim());
  }
  return `${existing.trim() ? `${existing.trim()}\n\n` : ""}${newBlock.trim()}\n`;
}

const getClaudeDesktopPath = () => {
  const platform = os.platform();
  const home = os.homedir();
  if (platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(home, "AppData", "Roaming"),
      "Claude",
      "claude_desktop_config.json",
    );
  }
  if (platform === "darwin") {
    return path.join(
      home,
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json",
    );
  }
  return path.join(home, ".config", "Claude", "claude_desktop_config.json");
};

const getClaudeCodePath = () => path.join(os.homedir(), ".claude.json");
const getAntigravityPath = () => path.join(os.homedir(), ".gemini", "config", "mcp_config.json");
const getCursorPath = () => path.join(process.cwd(), ".cursor", "mcp.json");
const getWindsurfPath = () => path.join(os.homedir(), ".codeium", "windsurf", "mcp_config.json");

const getZedPath = () => {
  const platform = os.platform();
  const home = os.homedir();
  if (platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(home, "AppData", "Roaming"),
      "Zed",
      "settings.json",
    );
  }
  return path.join(home, ".config", "zed", "settings.json");
};

const getCodexPath = () => path.join(os.homedir(), ".codex", "config.toml");

const getVsCodeGlobalPath = () => {
  const platform = os.platform();
  const home = os.homedir();
  if (platform === "win32") {
    return path.join(
      process.env.APPDATA || path.join(home, "AppData", "Roaming"),
      "Code",
      "User",
      "mcp.json",
    );
  }
  if (platform === "darwin") {
    return path.join(home, "Library", "Application Support", "Code", "User", "mcp.json");
  }
  return path.join(home, ".config", "Code", "User", "mcp.json");
};

const getVsCodeWorkspacePath = () => path.join(process.cwd(), ".vscode", "mcp.json");
const getOpenCodePath = () => path.join(os.homedir(), ".config", "opencode", "opencode.jsonc");

const CONFIG_PATHS = new Map<string, () => string>([
  ["1", getClaudeDesktopPath],
  ["2", getClaudeCodePath],
  ["3", getAntigravityPath],
  ["4", getCursorPath],
  ["5", getWindsurfPath],
  ["6", getZedPath],
  ["7", getCodexPath],
  ["8", getVsCodeGlobalPath],
  ["9", getVsCodeWorkspacePath],
  ["10", getOpenCodePath],
]);

export async function runInstall() {
  console.log("Nodes2Cloud MCP Installer\n=========================\n");

  type Prompter = {
    question: (q: string) => Promise<string>;
    close: () => void;
  };

  let prompterInstance: Prompter | null = null;

  const getPrompter = (): Prompter => {
    if (!prompterInstance) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      prompterInstance = {
        question: (q: string) => new Promise((resolve) => rl.question(q, resolve)),
        close: () => rl.close(),
      };
    }
    return prompterInstance;
  };

  const closePrompter = () => {
    if (prompterInstance) {
      prompterInstance.close();
      prompterInstance = null;
    }
  };

  try {
    // 1. Resolve API Key (flags -> env -> prompt)
    let rawApiKey =
      getArg(["--key", "--token"]) || process.env.N2C_API_KEY || process.env.N2C_SESSION_TOKEN;

    if (!rawApiKey) {
      rawApiKey = await getPrompter().question(
        "Enter your Nodes2Cloud Personal Access Token (n2c_pat_...): ",
      );
    }

    const apiKey = (rawApiKey || "").trim();
    if (!apiKey.startsWith("n2c_pat_")) {
      console.error("Invalid API key format. Must start with n2c_pat_");
      closePrompter();
      process.exit(1);
    }

    // 2. Resolve Endpoint
    const envValue = (getArg(["--env"]) || "production").toLowerCase();
    let endpoint = getArg(["--endpoint"]) || "https://api.nodes2cloud.com/mcp";
    if (envValue === "staging") endpoint = "https://api-staging.nodes2cloud.com/mcp";
    if (envValue === "local") endpoint = "http://localhost:8787/mcp";

    // 3. Resolve Target Client
    let choice = (getArg(["--client", "-c"]) || "").trim();
    if (!choice) {
      console.log("\nSelect Target Client:");
      console.log("1. Claude Desktop");
      console.log("2. Claude Code");
      console.log("3. Antigravity Ecosystem (IDE, SDK, CLI, 2.0)");
      console.log("4. Cursor (Current Project)");
      console.log("5. Windsurf");
      console.log("6. Zed");
      console.log("7. Codex");
      console.log("8. VS Code (Global)");
      console.log("9. VS Code (Current Workspace)");
      console.log("10. Open Code");
      console.log("11. Other (Print config only)");
      const clientChoice = await getPrompter().question("Choice [1]: ");
      choice = clientChoice.trim() || "1";
    }

    closePrompter();

    const pathForChoice = CONFIG_PATHS.get(choice);
    let configPath = "";
    if (pathForChoice) {
      configPath = pathForChoice();
    } else if (choice !== "11") {
      console.log("Invalid choice, printing config instead.");
    }

    const command = process.platform === "win32" ? "npx.cmd" : "npx";

    const standardServerConfig = {
      command,
      args: ["-y", "n2c-mcp"],
      env: {
        N2C_MCP_ENDPOINT: endpoint,
        N2C_API_KEY: apiKey,
      },
    };

    const isDryRun = process.argv.includes("--dry-run") || process.argv.includes("--print");

    if (!configPath || isDryRun) {
      console.log("\nAdd the following configuration to your client:\n");
      if (choice === "6") {
        console.log(
          JSON.stringify(
            {
              context_servers: {
                nodes2cloud: {
                  command: {
                    path: command,
                    args: ["-y", "n2c-mcp"],
                    env: standardServerConfig.env,
                  },
                },
              },
            },
            null,
            2,
          ),
        );
      } else if (choice === "7") {
        console.log(
          `[mcp_servers.nodes2cloud]
command = "${command}"
args = ["-y", "n2c-mcp"]
[mcp_servers.nodes2cloud.env]
N2C_MCP_ENDPOINT = "${endpoint}"
N2C_API_KEY = "${apiKey}"`,
        );
      } else if (choice === "8" || choice === "9") {
        console.log(
          JSON.stringify(
            {
              servers: {
                nodes2cloud: {
                  type: "stdio",
                  command,
                  args: ["-y", "n2c-mcp"],
                  env: standardServerConfig.env,
                },
              },
            },
            null,
            2,
          ),
        );
      } else if (choice === "10") {
        console.log(
          JSON.stringify(
            {
              mcp: {
                nodes2cloud: {
                  type: "local",
                  command: [command, "-y", "n2c-mcp"],
                  environment: standardServerConfig.env,
                  enabled: true,
                },
              },
            },
            null,
            2,
          ),
        );
      } else {
        console.log(JSON.stringify({ mcpServers: { nodes2cloud: standardServerConfig } }, null, 2));
      }
      process.exit(0);
    }

    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Codex TOML
    if (configPath.endsWith(".toml")) {
      const tomlBlock = `[mcp_servers.nodes2cloud]
command = "${command}"
args = ["-y", "n2c-mcp"]
[mcp_servers.nodes2cloud.env]
N2C_MCP_ENDPOINT = "${endpoint}"
N2C_API_KEY = "${apiKey}"
`;
      let existingToml = "";
      if (fs.existsSync(configPath)) {
        existingToml = fs.readFileSync(configPath, "utf-8");
      }
      const updatedToml = updateCodexToml(existingToml, tomlBlock);
      fs.writeFileSync(configPath, updatedToml);
      fs.chmodSync(configPath, 0o600);
      console.log(`\nSuccessfully installed nodes2cloud MCP server to ${configPath}!`);
      console.log("You may need to restart your client to apply the changes.");
      process.exit(0);
    }

    type ConfigMap = {
      context_servers?: Record<string, unknown>;
      servers?: Record<string, unknown>;
      mcp?: Record<string, unknown>;
      mcpServers?: Record<string, unknown>;
      [key: string]: unknown;
    };

    // JSON / JSONC Clients
    let currentConfig: ConfigMap = {};
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, "utf-8");
      currentConfig = parseConfigFile(fileContent, configPath) as ConfigMap;
    }

    if (choice === "6") {
      // Zed: context_servers with nested command object
      const contextServers =
        currentConfig.context_servers && typeof currentConfig.context_servers === "object"
          ? currentConfig.context_servers
          : {};
      contextServers.nodes2cloud = {
        command: {
          path: command,
          args: ["-y", "n2c-mcp"],
          env: standardServerConfig.env,
        },
      };
      currentConfig.context_servers = contextServers;
    } else if (choice === "8" || choice === "9") {
      // VS Code: servers block with stdio type
      const servers =
        currentConfig.servers && typeof currentConfig.servers === "object"
          ? currentConfig.servers
          : {};
      servers.nodes2cloud = {
        type: "stdio",
        command,
        args: ["-y", "n2c-mcp"],
        env: standardServerConfig.env,
      };
      currentConfig.servers = servers;
    } else if (choice === "10") {
      // OpenCode: mcp block
      const mcp =
        currentConfig.mcp && typeof currentConfig.mcp === "object" ? currentConfig.mcp : {};
      mcp.nodes2cloud = {
        type: "local",
        command: [command, "-y", "n2c-mcp"],
        environment: standardServerConfig.env,
        enabled: true,
      };
      currentConfig.mcp = mcp;
    } else {
      // Standard: mcpServers
      const mcpServers =
        currentConfig.mcpServers && typeof currentConfig.mcpServers === "object"
          ? currentConfig.mcpServers
          : {};
      mcpServers.nodes2cloud = standardServerConfig;
      currentConfig.mcpServers = mcpServers;
    }

    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
    fs.chmodSync(configPath, 0o600);
    console.log(`\nSuccessfully installed nodes2cloud MCP server to ${configPath}!`);
    console.log("You may need to restart your client to apply the changes.");
    process.exit(0);
  } catch (err: unknown) {
    closePrompter();
    console.error(`Failed to install: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}
