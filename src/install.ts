import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as readline from "node:readline";
import {
  type AuthMode,
  buildSetup,
  type ConfigLocation,
  findClient,
  listedClients,
  MCP_ENDPOINTS,
  MCP_SERVER_NAME,
  type McpClient,
  type McpEnvironment,
  type OsName,
  proxyEntry,
  type SetupStep,
  setupContext,
  toJson,
  wrapAt,
} from "./clients/index.js";

type Scope = ConfigLocation["scope"];
type ConfigStep = Extract<SetupStep, { kind: "config" }>;

const TOKEN_PREFIX = "n2c_pat_";
const TOKEN_PROMPT = `Enter your Nodes2Cloud Personal Access Token (${TOKEN_PREFIX}...): `;

// --- Pure helpers (exported for tests) ---------------------------------------

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

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replaces the TOML table `[table]` (and its sub-tables such as `[table.env]`)
 * with `block`, or appends `block` when the table is missing. Never duplicates it.
 */
export function updateTomlTable(existing: string, table: string, block: string): string {
  const name = escapeRegExp(table);
  const regex = new RegExp(`(?<=^|\\n)\\[${name}\\][\\s\\S]*?(?=\\n\\[(?!${name}[.\\]])|$)`);
  const trimmed = block.trim();
  const match = regex.exec(existing);
  if (match) {
    const keepNewline = match[0].endsWith("\n") ? "\n" : "";
    const updated =
      existing.slice(0, match.index) +
      trimmed +
      keepNewline +
      existing.slice(match.index + match[0].length);
    return updated.endsWith("\n") ? updated : `${updated}\n`;
  }
  return `${existing.trim() ? `${existing.trimEnd()}\n\n` : ""}${trimmed}\n`;
}

/** Updates or inserts the [mcp_servers.nodes2cloud] section in Codex TOML without duplicating tables. */
export function updateCodexToml(existing: string, newBlock: string): string {
  return updateTomlTable(existing, `mcp_servers.${MCP_SERVER_NAME}`, newBlock);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Sets `value` at `keyPath`, creating intermediate objects. Each element is one
 * literal key: `["amp.mcpServers", "x"]` sets `target["amp.mcpServers"].x`.
 */
export function setAtKeyPath(
  target: Record<string, unknown>,
  keyPath: string[],
  value: unknown,
): Record<string, unknown> {
  if (keyPath.length === 0) throw new Error("Empty key path.");
  let node = target;
  for (const key of keyPath.slice(0, -1)) {
    if (!isPlainObject(node[key])) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[keyPath[keyPath.length - 1] as string] = value;
  return target;
}

export interface PathContext {
  home: string;
  cwd: string;
  appData?: string;
}

/**
 * Turns a registry path into an absolute one: `~` is the home directory,
 * `%APPDATA%` and `%USERPROFILE%` are the Windows folders, anything else
 * relative is relative to the current directory.
 */
export function resolveConfigPath(
  location: string,
  ctx: PathContext = { home: os.homedir(), cwd: process.cwd(), appData: process.env.APPDATA },
): string {
  const p = location.replace(/[\\/]+/g, path.sep);
  if (p === "~" || p.startsWith(`~${path.sep}`)) return path.join(ctx.home, p.slice(1));
  const appData = /^%APPDATA%/i.exec(p);
  if (appData) {
    const base = ctx.appData || path.join(ctx.home, "AppData", "Roaming");
    return path.join(base, p.slice(appData[0].length));
  }
  const profile = /^%USERPROFILE%/i.exec(p);
  if (profile) return path.join(ctx.home, p.slice(profile[0].length));
  return path.resolve(ctx.cwd, p);
}

export function currentOs(platform: NodeJS.Platform = process.platform): OsName {
  if (platform === "win32") return "win";
  if (platform === "darwin") return "mac";
  return "linux";
}

function locationMatches(location: ConfigLocation, osName: OsName, scope?: Scope): boolean {
  return (!scope || location.scope === scope) && (!location.os || location.os.includes(osName));
}

/** A config step the installer can merge into: JSON or TOML, with a key path. */
function isWritable(step: SetupStep): step is ConfigStep {
  return (
    step.kind === "config" &&
    (step.target.format === "json" || step.target.format === "toml") &&
    step.target.keyPath.length > 0
  );
}

/** The first writable config step with a location for this scope and OS. */
export function findWritable(
  steps: SetupStep[],
  scope: Scope,
  osName: OsName,
): { step: ConfigStep; location: ConfigLocation } | undefined {
  for (const step of steps) {
    if (!isWritable(step)) continue;
    const location = step.target.locations.find((loc) => locationMatches(loc, osName, scope));
    if (location) return { step, location };
  }
  return undefined;
}

/** `user` when a writable step has a user location on this OS, else `project`, else none. */
export function defaultScope(steps: SetupStep[], osName: OsName): Scope | undefined {
  if (findWritable(steps, "user", osName)) return "user";
  if (findWritable(steps, "project", osName)) return "project";
  return undefined;
}

/** OAuth when the client can do it and no token was given; a given token wins if usable. */
export function chooseMode(
  client: McpClient,
  hasToken: boolean,
  forced?: AuthMode,
): AuthMode | undefined {
  if (forced && client.setup[forced]) return forced;
  if (hasToken && client.setup.token) return "token";
  if (client.setup.oauth) return "oauth";
  if (client.setup.token) return "token";
  return undefined;
}

// --- CLI -------------------------------------------------------------------------

function getArg(argv: string[], flags: string[]): string | undefined {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string;
    for (const flag of flags) {
      if (arg === flag && i + 1 < argv.length) return argv[i + 1];
      if (arg.startsWith(`${flag}=`)) return arg.slice(flag.length + 1);
    }
  }
  return undefined;
}

/** The numbered choices of the installer's first version, kept so old docs still work. */
const LEGACY_CHOICES: Record<string, { id: string; scope?: Scope; mode?: AuthMode }> = {
  // Claude Desktop's config file only runs local servers: token + stdio proxy.
  "1": { id: "claude", mode: "token" },
  "2": { id: "claude-code" },
  "3": { id: "antigravity" },
  "4": { id: "cursor", scope: "project" },
  "5": { id: "windsurf-cascade" },
  "6": { id: "zed" },
  "7": { id: "codex" },
  "8": { id: "vscode", scope: "user" },
  "9": { id: "vscode", scope: "project" },
  "10": { id: "opencode" },
};
const LEGACY_GENERIC = "11";

interface Prompter {
  question: (q: string) => Promise<string>;
  close: () => void;
}

/** Lazily opens readline; a closed or empty stdin answers "" instead of hanging. */
function createPrompter(): Prompter {
  let rl: readline.Interface | undefined;
  let closed = false;
  return {
    question(q) {
      if (closed) return Promise.resolve("");
      if (!rl) {
        rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.on("close", () => {
          closed = true;
        });
      }
      const current = rl;
      return new Promise((resolve) => {
        const onClose = () => {
          process.stdout.write("\n");
          resolve("");
        };
        current.once("close", onClose);
        current.question(q, (answer) => {
          current.off("close", onClose);
          resolve(answer);
        });
      });
    },
    close() {
      rl?.close();
      rl = undefined;
    },
  };
}

interface Options {
  osName: OsName;
  url: string;
  token?: string;
}

/** Steps rendered with a placeholder token, to inspect what a client can do. */
function previewSteps(client: McpClient, mode: AuthMode, opts: Options): SetupStep[] {
  return buildSetup(client, mode, setupContext({ url: opts.url, os: opts.osName }));
}

/** Where `install --client <id>` would write, or undefined when it only prints steps. */
function installTarget(client: McpClient, opts: Options): ConfigLocation | undefined {
  const mode = chooseMode(client, Boolean(opts.token));
  if (!mode) return undefined;
  const steps = previewSteps(client, mode, opts);
  const scope = defaultScope(steps, opts.osName);
  return scope ? findWritable(steps, scope, opts.osName)?.location : undefined;
}

function shownLocations(locations: ConfigLocation[], osName: OsName): ConfigLocation[] {
  const forOs = locations.filter((loc) => locationMatches(loc, osName));
  return forOs.length > 0 ? forOs : locations;
}

function printStep(step: SetupStep, n: number, osName: OsName): void {
  console.log(`${n}. ${step.label}`);
  switch (step.kind) {
    case "link":
      console.log(`   ${step.href}`);
      break;
    case "command":
      console.log(`   ${step.command}`);
      break;
    case "steps":
      step.steps.forEach((line, i) => {
        console.log(`   ${i + 1}) ${line}`);
      });
      break;
    case "config":
      for (const loc of shownLocations(step.target.locations, osName)) {
        console.log(`   File: ${loc.path} (${loc.scope})`);
      }
      console.log(`\n${step.content}`);
      break;
    case "code":
      console.log(`\n${step.code}`);
      break;
  }
  console.log("");
}

function printNotes(client: McpClient): void {
  if (!client.notes?.length) return;
  console.log("Notes:");
  for (const note of client.notes) console.log(`- ${note}`);
}

function modeLine(mode: AuthMode): string {
  return mode === "oauth"
    ? "signs in through your browser, no token needed"
    : "uses your Personal Access Token";
}

function printList(opts: Options): void {
  const clients = listedClients();
  const width = Math.max(...clients.map((c) => c.id.length)) + 2;
  const labelWidth = Math.max(...clients.map((c) => c.label.length)) + 2;
  const writes: string[] = [];
  const prints: string[] = [];
  for (const client of clients) {
    const target = installTarget(client, opts);
    const line = `  ${client.id.padEnd(width)}${client.label.padEnd(labelWidth)}`;
    if (target) writes.push(`${line}${target.path}`);
    else prints.push(line.trimEnd());
  }
  console.log("Pass one of these ids to --client.\n");
  console.log("Writes the config file:");
  for (const line of writes) console.log(line);
  console.log("\nPrints the setup steps:");
  for (const line of prints) console.log(line);
  console.log(
    `\nClients that support it sign in through the browser (OAuth). Pass --key ${TOKEN_PREFIX}... to use a token instead.`,
  );
  console.log("The numbers 1-11 from earlier versions still work.");
}

type Selection = { client: McpClient } | { generic: true } | { error: string };

async function chooseFromMenu(prompter: Prompter, opts: Options): Promise<Selection> {
  const installable = listedClients().filter((client) => installTarget(client, opts));
  console.log("Select your MCP client:");
  installable.forEach((client, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${client.label} (${client.id})`);
  });
  const other = installable.length + 1;
  console.log(`  ${String(other).padStart(2)}. Other — print config only`);
  console.log("  (Or type any id from --list.)");
  const answer = (await prompter.question("Choice: ")).trim();
  if (!answer) return { error: "No client selected. Pass --client <id>; --list shows the ids." };
  if (/^\d+$/.test(answer)) {
    const n = Number(answer);
    if (n === other) return { generic: true };
    const client = installable[n - 1];
    return client ? { client } : { error: `Invalid choice: ${answer}` };
  }
  const client = findClient(answer);
  return client ? { client } : { error: `Unknown client "${answer}". Run with --list.` };
}

async function resolveToken(
  prompter: Prompter,
  supplied: string | undefined,
): Promise<string | undefined> {
  const token = (supplied || (await prompter.question(TOKEN_PROMPT))).trim();
  if (!token.startsWith(TOKEN_PREFIX)) {
    console.error(`Invalid API key format. Must start with ${TOKEN_PREFIX}`);
    return undefined;
  }
  return token;
}

function writeConfig(step: ConfigStep, filePath: string, restrict: boolean): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf-8") : "";
  let output: string;
  if (step.target.format === "toml") {
    output = updateTomlTable(existing, step.target.keyPath.join("."), step.content);
  } else {
    const config = parseConfigFile(existing, filePath);
    setAtKeyPath(config, step.target.keyPath, step.target.entry);
    output = `${toJson(config)}\n`;
  }
  fs.writeFileSync(filePath, output);
  // The file holds a token in plain text: readable by the user only.
  if (restrict) fs.chmodSync(filePath, 0o600);
}

async function install(argv: string[], prompter: Prompter): Promise<number> {
  const osName = currentOs();
  const isPrint = argv.includes("--print") || argv.includes("--dry-run");

  const envName = (getArg(argv, ["--env"]) || "production").toLowerCase();
  if (!Object.hasOwn(MCP_ENDPOINTS, envName)) {
    console.error(`Unknown --env "${envName}". Use production, staging or local.`);
    return 1;
  }
  const url = getArg(argv, ["--endpoint"])?.trim() || MCP_ENDPOINTS[envName as McpEnvironment];

  const scopeArg = getArg(argv, ["--scope"])?.trim().toLowerCase();
  if (scopeArg && scopeArg !== "user" && scopeArg !== "project") {
    console.error(`Unknown --scope "${scopeArg}". Use user or project.`);
    return 1;
  }

  const suppliedToken =
    (
      getArg(argv, ["--token", "--key"]) ||
      process.env.N2C_API_KEY ||
      process.env.N2C_SESSION_TOKEN ||
      ""
    ).trim() || undefined;
  const opts: Options = { osName, url, token: suppliedToken };

  if (argv.includes("--list")) {
    printList(opts);
    return 0;
  }

  // 1. Which client.
  const choice = getArg(argv, ["--client", "-c"])?.trim();
  let legacy: (typeof LEGACY_CHOICES)[string] | undefined;
  let selection: Selection;
  if (!choice) {
    selection = await chooseFromMenu(prompter, opts);
  } else if (choice === LEGACY_GENERIC) {
    selection = { generic: true };
  } else {
    legacy = LEGACY_CHOICES[choice];
    const client = findClient(legacy ? legacy.id : choice);
    selection = client
      ? { client }
      : { error: `Unknown client "${choice}". Run with --list to see the ids.` };
  }
  if ("error" in selection) {
    console.error(selection.error);
    return 1;
  }

  // 2. Generic stdio proxy entry: always a token, always printed.
  if ("generic" in selection) {
    const token = await resolveToken(prompter, suppliedToken);
    if (!token) return 1;
    const ctx = setupContext({ url, token, os: osName });
    console.log("\nAdd the following configuration to your client:\n");
    console.log(toJson(wrapAt(["mcpServers", ctx.name], proxyEntry(ctx))));
    return 0;
  }

  // 3. Auth mode, and a token only when that mode needs one.
  const { client } = selection;
  const mode = chooseMode(client, Boolean(suppliedToken), legacy?.mode);
  if (!mode) {
    console.error(`${client.label} has no setup.`);
    return 1;
  }
  let token: string | undefined;
  if (mode === "token") {
    token = await resolveToken(prompter, suppliedToken);
    if (!token) return 1;
  } else if (suppliedToken) {
    console.log(`${client.label} can't use a token here; it signs in through the browser.\n`);
  }

  const ctx = setupContext({ url, os: osName, ...(token ? { token } : {}) });
  const steps = buildSetup(client, mode, ctx);

  // 4. Where to write, if anywhere.
  const requestedScope = (scopeArg as Scope | undefined) ?? legacy?.scope;
  const scope = requestedScope ?? defaultScope(steps, osName);
  const writable = scope ? findWritable(steps, scope, osName) : undefined;

  if (isPrint || !writable) {
    if (!isPrint && requestedScope && defaultScope(steps, osName)) {
      console.log(
        `${client.label} has no ${requestedScope}-scope config file on this OS, so here are its setup steps.\n`,
      );
    }
    console.log(`${client.label} (${modeLine(mode)}):\n`);
    steps.forEach((step, i) => {
      printStep(step, i + 1, osName);
    });
    printNotes(client);
    return 0;
  }

  const filePath = resolveConfigPath(writable.location.path);
  writeConfig(writable.step, filePath, mode === "token");
  console.log(
    `Installed ${ctx.name} for ${client.label} in ${filePath} (${writable.location.scope} scope).`,
  );

  if (mode === "oauth") {
    console.log(`\nNext: open ${client.label} and approve the browser sign-in when it connects.`);
    const index = steps.indexOf(writable.step);
    const followUps = steps.filter(
      (step, i) =>
        step.kind !== "config" &&
        step.kind !== "link" &&
        (i > index || /sign in/i.test(step.label)),
    );
    if (followUps.length > 0) {
      console.log("");
      followUps.forEach((step, i) => {
        printStep(step, i + 1, osName);
      });
    }
  } else {
    console.log(`\nRestart ${client.label} (or reload its MCP servers) to pick up the change.`);
    console.log(
      "The token is stored in plain text in that file, which is now readable only by you.",
    );
    if (writable.location.scope === "project") {
      console.log("The file is inside your project: keep it out of version control.");
    }
  }
  if (client.notes?.length) console.log("");
  printNotes(client);
  return 0;
}

export async function runInstall(argv: string[] = process.argv.slice(2)): Promise<void> {
  console.log("Nodes2Cloud MCP Installer\n=========================\n");
  const prompter = createPrompter();
  try {
    // Set the code instead of calling process.exit so piped stdout flushes fully.
    process.exitCode = await install(argv, prompter);
  } catch (err: unknown) {
    console.error(`Failed to install: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  } finally {
    prompter.close();
  }
}
