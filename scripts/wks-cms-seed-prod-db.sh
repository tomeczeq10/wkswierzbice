#!/usr/bin/env bash
# Jednorazowo (lub po świeżym clone): wypełnia produkcyjny SQLite w deploy/wks/persist
# tymi samymi skryptami co lokalnie — wtedy /admin pokazuje Media, News itd.
#
# Na serwerze: **Node 20** w PATH **albo Docker** (gdy brak Node — skrypt użyje
# `docker run node:20-bookworm` z mountem repo + persist). Repozytorium jak w
# DEPLOY-HOME-SERVER. Pierwszy `npm ci` trwa kilka minut.
#
# Z laptopa:
#   export WKS_SSH_HOST=root@192.168.0.5   # lub Tailscale / publiczny host
#   npm run seed:cms-on-server
#
# Opcjonalnie:
#   WKS_DEPLOY_PATH=/srv/wks/wks_cms
#   WKS_SEED_FORCE_NPM_CI=1   — wymuś npm ci nawet gdy node_modules już jest
#
# Po skrypcie: chown persist na uid kontenera (1001) + restart wks-cms.

set -euo pipefail

: "${WKS_SSH_HOST:?Ustaw WKS_SSH_HOST, np. export WKS_SSH_HOST=root@192.168.0.5}"

WKS_DEPLOY_PATH="${WKS_DEPLOY_PATH:-/srv/wks/wks_cms}"
WKS_SEED_FORCE_NPM_CI="${WKS_SEED_FORCE_NPM_CI:-0}"

exec ssh -o BatchMode=yes "${WKS_SSH_HOST}" \
  env WKS_DEPLOY_PATH="${WKS_DEPLOY_PATH}" WKS_SEED_FORCE_NPM_CI="${WKS_SEED_FORCE_NPM_CI}" \
  bash -s <<'REMOTE'
set -euo pipefail
cd "${WKS_DEPLOY_PATH}"

# Nieinteraktywny SSH często nie ładuje .bashrc — nvm / node poza PATH.
export NVM_DIR="${NVM_DIR:-${HOME:-/root}/.nvm}"
if [[ -s "${NVM_DIR}/nvm.sh" ]]; then
  # shellcheck disable=SC1090
  . "${NVM_DIR}/nvm.sh"
fi
if ! command -v node >/dev/null 2>&1 && [[ -x /usr/local/bin/node ]]; then
  export PATH="/usr/local/bin:${PATH}"
fi

ENV_FILE="deploy/wks/.env.cms"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Brak ${ENV_FILE} — skopiuj z env.cms.example i ustaw PAYLOAD_SECRET." >&2
  exit 1
fi

getenv_line() {
  local key="$1"
  grep -E "^${key}=" "${ENV_FILE}" | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//'
}

export PAYLOAD_SECRET="$(getenv_line PAYLOAD_SECRET)"
if [[ -z "${PAYLOAD_SECRET}" || "${PAYLOAD_SECRET}" == REPLACE_ME ]]; then
  echo "PAYLOAD_SECRET w ${ENV_FILE} jest pusty lub REPLACE_ME." >&2
  exit 1
fi

export DATABASE_URL="file:${WKS_DEPLOY_PATH}/deploy/wks/persist/cms.db"
export UPLOADS_DIR="${WKS_DEPLOY_PATH}/deploy/wks/persist/media"
mkdir -p "${UPLOADS_DIR}"

ADMIN_EMAIL="$(getenv_line ADMIN_EMAIL || true)"
ADMIN_PASSWORD="$(getenv_line ADMIN_PASSWORD || true)"
# W env.cms.example jest devowy admin@wks.local — na serwerze i tak chcemy konto klubowe.
if [[ -z "${ADMIN_EMAIL}" || "${ADMIN_EMAIL}" == "admin@wks.local" ]]; then
  ADMIN_EMAIL="admin@wkswierzbice.pl"
fi
export ADMIN_EMAIL
[[ -n "${ADMIN_PASSWORD}" ]] && export ADMIN_PASSWORD

run_tsx() {
  echo "=== npx tsx $* ==="
  npx tsx "$@"
}

run_all_seeds() {
  run_tsx apps/cms/scripts/seed-admin.ts
  run_tsx apps/cms/scripts/migrate-news.ts
  run_tsx apps/cms/scripts/migrate-news-covers.ts
  run_tsx apps/cms/scripts/migrate-teams.ts
  run_tsx apps/cms/scripts/migrate-team-photos.ts
  run_tsx apps/cms/scripts/seed-hero-and-static-pages.ts
  run_tsx apps/cms/scripts/migrate-site-people-and-sponsors.ts
}

seed_via_docker_node() {
  local envf
  envf="$(mktemp)"
  trap 'rm -f "${envf}"' RETURN
  {
    echo "NODE_ENV=production"
    echo "DATABASE_URL=file:/data/wks/cms.db"
    echo "UPLOADS_DIR=/data/wks/media"
    printf 'PAYLOAD_SECRET=%s\n' "${PAYLOAD_SECRET}"
    printf 'ADMIN_EMAIL=%s\n' "${ADMIN_EMAIL}"
    if [[ -n "${ADMIN_PASSWORD:-}" ]]; then
      printf 'ADMIN_PASSWORD=%s\n' "${ADMIN_PASSWORD}"
    fi
  } >"${envf}"

  echo "=== seed: Docker node:20-bookworm (brak Node 20 na hoście) ==="
  docker run --rm --user root \
    --env-file "${envf}" \
    -v "${WKS_DEPLOY_PATH}:/app:rw" \
    -v "${WKS_DEPLOY_PATH}/deploy/wks/persist:/data/wks:rw" \
    -w /app \
    node:20-bookworm \
    bash -eo pipefail -c 'npm ci --include=dev --no-audit --no-fund && \
      npx tsx apps/cms/scripts/seed-admin.ts && \
      npx tsx apps/cms/scripts/migrate-news.ts && \
      npx tsx apps/cms/scripts/migrate-news-covers.ts && \
      npx tsx apps/cms/scripts/migrate-teams.ts && \
      npx tsx apps/cms/scripts/migrate-team-photos.ts && \
      npx tsx apps/cms/scripts/seed-hero-and-static-pages.ts && \
      npx tsx apps/cms/scripts/migrate-site-people-and-sponsors.ts'
}

if command -v node >/dev/null 2>&1 && node -e "process.exit(/^v20\\./.test(process.version)?0:1)" 2>/dev/null; then
  export NODE_ENV=production
  if [[ "${WKS_SEED_FORCE_NPM_CI}" == "1" ]] || [[ ! -d node_modules ]]; then
    echo "=== npm ci (root monorepo) ==="
    npm ci --no-audit --no-fund
  fi
  run_all_seeds
elif command -v docker >/dev/null 2>&1; then
  seed_via_docker_node
else
  echo "Brak Node 20 w PATH i brak docker — zainstaluj Node 20 (nvm/NodeSource) albo Docker." >&2
  exit 1
fi

echo "=== chown persist (uid 1001 = użytkownik w kontenerze wks-cms) ==="
chown -R 1001:1001 deploy/wks/persist || true
chmod -R u+rwX,g+rwX deploy/wks/persist || true

if [[ -f deploy/wks/docker-compose.yml ]]; then
  echo "=== docker compose restart wks-cms ==="
  (cd deploy/wks && docker compose restart wks-cms)
fi

echo "Gotowe. Sprawdź https://…/admin/collections/media"
REMOTE
