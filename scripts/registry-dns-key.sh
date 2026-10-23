#!/usr/bin/env bash
# Generates the MCP Registry signing key for the `com.nodes2cloud/*` namespace
# and prints the DNS TXT record to add at the APEX of nodes2cloud.com.
#
# The private key is written OUTSIDE any repository, to ~/.n2c-mcp-registry/,
# readable only by you. Its hex form goes into the GitHub `release`
# environment secret MCP_REGISTRY_PRIVATE_KEY; nowhere else.
set -euo pipefail

DOMAIN="nodes2cloud.com"
DIR="${HOME}/.n2c-mcp-registry"
KEY="${DIR}/key.pem"

# Ed25519 needs OpenSSL 3; macOS's system LibreSSL lacks it.
OPENSSL="$(command -v /opt/homebrew/opt/openssl@3/bin/openssl || command -v /usr/local/opt/openssl@3/bin/openssl || command -v openssl)"
if ! "${OPENSSL}" version | grep -q "^OpenSSL 3"; then
  echo "OpenSSL 3 is required (brew install openssl@3)." >&2
  exit 1
fi

mkdir -p "${DIR}"
chmod 700 "${DIR}"
if [ -e "${KEY}" ]; then
  echo "A key already exists at ${KEY}; refusing to overwrite it." >&2
  echo "Delete it first only if you are rotating (and then remove the old TXT record)." >&2
  exit 1
fi

(umask 077 && "${OPENSSL}" genpkey -algorithm Ed25519 -out "${KEY}")
PUBLIC_KEY="$("${OPENSSL}" pkey -in "${KEY}" -pubout -outform DER | tail -c 32 | base64)"

cat <<EOF

1. Add this TXT record at the APEX of ${DOMAIN} (name "@" in Cloudflare DNS,
   not a subdomain such as _mcp-auth):

     v=MCPv1; k=ed25519; p=${PUBLIC_KEY}

2. Check it has propagated:

     dig +short TXT ${DOMAIN} | grep MCPv1

3. Store the private key as the GitHub environment secret MCP_REGISTRY_PRIVATE_KEY
   (repo Settings → Environments → release → Add secret). Print it with:

     ${OPENSSL} pkey -in "${KEY}" -noout -text | grep -A3 "priv:" | tail -n +2 | tr -d ' :\\n'

   Copy it straight into GitHub; do not paste it into chat, issues or files.
EOF
