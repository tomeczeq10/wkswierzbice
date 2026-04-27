#!/usr/bin/env bash
# Deploy: git pull na serwerze + docker compose (WKS home server).
# Uruchamiaj Z LOKALNEGO REPO (nie wewnątrz kontenera).
#
# Wymagane:
#   export WKS_SSH_HOST='root@twoj-host'   # LAN, Tailscale lub publiczny SSH
# Opcjonalne:
#   WKS_DEPLOY_PATH=/srv/wks/wks_cms      # katalog z klonem repo + deploy/wks
#   WKS_BRANCH=main
#   WKS_REMOTE=origin
#   WKS_DOCKER_BUILD=1                  # 0 = tylko `up -d` bez --build

set -euo pipefail

: "${WKS_SSH_HOST:?Ustaw WKS_SSH_HOST, np. export WKS_SSH_HOST=root@192.168.0.5}"

WKS_DEPLOY_PATH="${WKS_DEPLOY_PATH:-/srv/wks/wks_cms}"
WKS_BRANCH="${WKS_BRANCH:-main}"
WKS_REMOTE="${WKS_REMOTE:-origin}"
WKS_DOCKER_BUILD="${WKS_DOCKER_BUILD:-1}"

ssh -o BatchMode=yes "${WKS_SSH_HOST}" bash -s <<EOF
set -euo pipefail
DEPLOY_PATH="${WKS_DEPLOY_PATH}"
BRANCH="${WKS_BRANCH}"
REMOTE="${WKS_REMOTE}"
DOCKER_BUILD="${WKS_DOCKER_BUILD}"

cd "\${DEPLOY_PATH}"
if [[ ! -d .git ]]; then
  echo "Błąd: \${DEPLOY_PATH} nie jest klonem git (.git brak)." >&2
  exit 1
fi

git fetch "\${REMOTE}" "\${BRANCH}"
git checkout "\${BRANCH}"
git pull --ff-only "\${REMOTE}" "\${BRANCH}"

cd deploy/wks
if [[ "\${DOCKER_BUILD}" == "1" ]]; then
  docker compose up -d --build
else
  docker compose up -d
fi

docker compose ps
EOF
