/** Kept equal to package.json's `version` (asserted by `tests/proxy.test.mjs`). */
export const CLI_VERSION = "1.2.0";

export const DEFAULT_ENDPOINT = "https://api.nodes2cloud.com/mcp";

export const DOCS_URL = "https://docs.nodes2cloud.com/docs/getting-started/mcp";

/** Newest first. The proxy answers `initialize` itself only in preview mode. */
export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

export const USER_AGENT = `n2c-mcp/${CLI_VERSION} (node ${process.version})`;
