#!/usr/bin/env bash
# Refreshes the vendored MCP client registry in src/clients/.
#
# The canonical source is n2c-api's packages/shared/src/mcp-clients/. Never edit
# the vendored copy here: change it in n2c-api, then run `npm run sync:clients`.
#
# N2C_API_DIR points at an n2c-api checkout (default: ../n2c-api).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

SRC="${N2C_API_DIR:-../n2c-api}/packages/shared/src/mcp-clients/"
if [ ! -d "${SRC}" ]; then
  echo "Registry not found at ${SRC}. Set N2C_API_DIR to an n2c-api checkout." >&2
  exit 1
fi

mkdir -p src/clients
rsync -a --delete --exclude='*.test.ts' --include='*.ts' --exclude='*' "${SRC}" src/clients/
echo "Synced $(ls src/clients | wc -l | tr -d ' ') files from ${SRC} into src/clients/."
