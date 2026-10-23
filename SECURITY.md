# Security policy

## Reporting a vulnerability

Email **security@nodes2cloud.com** with a description, steps to reproduce and the affected version. Please don't open a public issue for a vulnerability.

We aim to acknowledge reports within 3 business days and to keep you updated until it is resolved. We credit reporters who want to be credited.

## Scope

- This repository: the `n2c-mcp` npm package (the stdio proxy and its installer).
- The hosted MCP server at `https://api.nodes2cloud.com/mcp`, including OAuth, scopes and deploy approvals. Its source is not public, but reports about its behaviour are in scope.

## Supported versions

Only the latest published `n2c-mcp` release receives fixes. Run it with `npx -y n2c-mcp@latest`.

## How releases are made

Releases are published from GitHub Actions only, using npm trusted publishing (no long-lived npm token exists) with [provenance](https://docs.npmjs.com/generating-provenance-statements). You can check that a version was built from this repository with:

```bash
npm audit signatures
```

or on the package's npm page, under **Provenance**.
