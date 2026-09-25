#!/usr/bin/env bash
# ExcerLock API deploy: local build -> rsync -> remote production install ->
# systemd restart. Run from anywhere; paths resolve from this file.

set -euo pipefail

# agent-ops release lock: retain the descriptor through the entire deploy.
AGENT_OPS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if ! python3 "$AGENT_OPS_ROOT/scripts/agent-ops.py" held; then
  exec python3 "$AGENT_OPS_ROOT/scripts/agent-ops.py" run -- bash "${BASH_SOURCE[0]}" "$@"
fi

DRY_RUN=false
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-}"
DEPLOY_SSH_PORT="${DEPLOY_SSH_PORT:-22}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SERVER_DIR="${REPO_ROOT}/server"
REMOTE_DIR="/opt/excerlock/server"
SERVICE_NAME="excerlock-api.service"

usage() {
  cat <<'EOF'
Usage: DEPLOY_HOST=user@host DEPLOY_SSH_KEY=/absolute/path/to/key deploy/deploy.sh [--dry-run]

Environment:
  DEPLOY_HOST      SSH destination, normally johan@<Azure public IP> (required).
  DEPLOY_SSH_KEY   Private key authorized for DEPLOY_HOST (required).
  DEPLOY_SSH_PORT  SSH port (optional; defaults to 22).

Options:
  --dry-run  Print every build, rsync, SSH, and systemd step without executing it.
  -h, --help Show this help.
EOF
}

log() {
  printf '\n▸ %s\n' "$*"
}

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "$1 is required but was not found in PATH"
}

print_command() {
  printf 'DRY-RUN:'
  printf ' %q' "$@"
  printf '\n'
}

run_command() {
  if "$DRY_RUN"; then
    print_command "$@"
  else
    "$@"
  fi
}

run_in_repo() {
  if "$DRY_RUN"; then
    printf 'DRY-RUN: (cd %q &&' "$REPO_ROOT"
    printf ' %q' "$@"
    printf ')\n'
  else
    (
      cd "$REPO_ROOT"
      "$@"
    )
  fi
}

while (($# > 0)); do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1 (expected --dry-run or --help)"
      ;;
  esac
  shift
done

[[ -n "$DEPLOY_HOST" ]] ||
  die "DEPLOY_HOST is required (example: export DEPLOY_HOST=johan@203.0.113.10)"
[[ -n "$DEPLOY_SSH_KEY" ]] ||
  die "DEPLOY_SSH_KEY is required (set it to the private key authorized on DEPLOY_HOST)"

[[ "$DEPLOY_HOST" =~ ^([A-Za-z0-9._-]+@)?[A-Za-z0-9.-]+$ ]] ||
  die "DEPLOY_HOST must be a hostname or user@hostname without spaces or shell metacharacters"
if [[ ! "$DEPLOY_SSH_PORT" =~ ^[0-9]+$ ]] ||
  ((DEPLOY_SSH_PORT < 1 || DEPLOY_SSH_PORT > 65535)); then
  die "DEPLOY_SSH_PORT must be an integer from 1 to 65535"
fi
[[ -f "$DEPLOY_SSH_KEY" ]] ||
  die "DEPLOY_SSH_KEY does not name a file: $DEPLOY_SSH_KEY"
[[ -r "$DEPLOY_SSH_KEY" ]] ||
  die "DEPLOY_SSH_KEY is not readable: $DEPLOY_SSH_KEY"
[[ -f "${SERVER_DIR}/package.json" ]] ||
  die "server/package.json not found relative to $SCRIPT_DIR"
[[ -f "${SERVER_DIR}/package-lock.json" ]] ||
  die "server/package-lock.json is required for the remote npm ci"
[[ -f "${SCRIPT_DIR}/Caddyfile" ]] ||
  die "deploy/Caddyfile not found"
[[ -f "${SCRIPT_DIR}/${SERVICE_NAME}" ]] ||
  die "deploy/${SERVICE_NAME} not found"

require_command npm
require_command rsync
require_command ssh

SSH_OPTIONS=(
  -i "$DEPLOY_SSH_KEY"
  -p "$DEPLOY_SSH_PORT"
  -o BatchMode=yes
  -o ConnectTimeout=10
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=yes
)
printf -v RSYNC_SSH 'ssh -i %q -p %q -o BatchMode=yes -o ConnectTimeout=10 -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes' \
  "$DEPLOY_SSH_KEY" "$DEPLOY_SSH_PORT"
RSYNC_OPTIONS=(
  -az
  --itemize-changes
  -e "$RSYNC_SSH"
  --rsync-path="sudo -n -u excerlock rsync"
)

REMOTE_PREFLIGHT='set -eu
sudo -n true || {
  printf "ERROR: the deploy user needs passwordless sudo on DEPLOY_HOST\n" >&2
  exit 1
}
sudo test -r /etc/excerlock/env || {
  printf "ERROR: /etc/excerlock/env is missing or unreadable; create it before the first deploy\n" >&2
  exit 1
}
sudo install -d -m 0755 -o excerlock -g excerlock /opt/excerlock/server /opt/excerlock/server/dist /opt/excerlock/server/deploy /opt/excerlock/server/drizzle'

# Expansion of attempt belongs to the remote shell, not this local script.
# shellcheck disable=SC2016
REMOTE_ACTIVATE='set -eu
cd /opt/excerlock/server
sudo -n -u excerlock npm ci --omit=dev --no-audit --no-fund
# Apply pending migrations BEFORE the restart, so new code never meets an old
# schema. systemd-run supplies the same EnvironmentFile the service uses, which
# keeps DATABASE_URL out of the process table and off this script. Drizzle
# journals what it has applied, so a no-op deploy stays a no-op. A non-zero exit
# aborts the deploy and leaves the previous service running.
sudo -n systemd-run --quiet --pipe --wait --collect \
  --unit=excerlock-migrate \
  --property=User=excerlock \
  --property=WorkingDirectory=/opt/excerlock/server \
  --property=EnvironmentFile=/etc/excerlock/env \
  /usr/bin/node dist/migrate.js
sudo caddy validate --config /opt/excerlock/server/deploy/Caddyfile --adapter caddyfile
sudo install -m 0644 -o root -g root /opt/excerlock/server/deploy/Caddyfile /etc/caddy/Caddyfile
sudo install -m 0644 -o root -g root /opt/excerlock/server/deploy/excerlock-api.service /etc/systemd/system/excerlock-api.service
sudo systemctl daemon-reload
sudo systemctl enable excerlock-api.service
sudo systemctl reload-or-restart caddy
sudo systemctl restart excerlock-api.service
attempt=1
while ! curl --fail --silent --show-error http://127.0.0.1:3000/v1/health >/dev/null; do
  if [ "$attempt" -ge 10 ]; then
    printf "ERROR: excerlock-api.service did not pass its local health check\n" >&2
    sudo systemctl --no-pager --full status excerlock-api.service >&2 || true
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done
# Liveness alone is what let an empty database hide behind a green deploy for
# days. Readiness verifies the schema this build expects is actually present,
# so a deploy that migrated nothing fails here instead of silently "succeeding".
curl --fail --silent --show-error http://127.0.0.1:3000/v1/ready >/dev/null || {
  printf "ERROR: the service is live but not ready; the schema is missing or incomplete\n" >&2
  curl --silent http://127.0.0.1:3000/v1/ready >&2 || true
  printf "\n" >&2
  exit 1
}
sudo systemctl is-active --quiet excerlock-api.service'

if "$DRY_RUN"; then
  printf 'Dry run requested; no commands will execute.\n'
fi

log "Check SSH authentication, passwordless sudo, and /etc/excerlock/env"
if ! run_command ssh "${SSH_OPTIONS[@]}" "$DEPLOY_HOST" "$REMOTE_PREFLIGHT"; then
  die "SSH preflight failed for $DEPLOY_HOST; verify DEPLOY_SSH_KEY and passwordless sudo"
fi

log "Build the server workspace"
run_in_repo npm run build --workspace server
if ! "$DRY_RUN"; then
  [[ -d "${SERVER_DIR}/dist" ]] ||
    die "server build completed without creating server/dist"
fi

log "Sync built server and package manifests"
run_command rsync "${RSYNC_OPTIONS[@]}" --delete \
  "${SERVER_DIR}/dist/" "${DEPLOY_HOST}:${REMOTE_DIR}/dist/"

# The migration SQL is data, not build output, so it never lands in dist/.
# dist/migrate.js resolves it at ../../../drizzle relative to dist/packages/db/, which is
# why it must sit beside dist/ rather than inside it.
run_command rsync "${RSYNC_OPTIONS[@]}" --delete \
  "${SERVER_DIR}/drizzle/" "${DEPLOY_HOST}:${REMOTE_DIR}/drizzle/"

# The box gets a production-pruned package.json, never the workspace one.
# server/package.json declares dev-only workspace siblings such as
# @excerlock/analytics-events, which is `private: true` and therefore absent
# from the public registry. `npm ci` resolves devDependencies even under
# --omit=dev, so shipping the manifest verbatim made the remote install die with
# E404 on 2026-07-30. Dropping devDependencies also makes the manifest agree
# with server/package-lock.json, whose root entry lists production deps only.
PRUNED_MANIFEST="$(mktemp -t excerlock-package.XXXXXX)"
trap 'rm -f "$PRUNED_MANIFEST"' EXIT
if "$DRY_RUN"; then
  print_command prune-dev-dependencies "${SERVER_DIR}/package.json" "$PRUNED_MANIFEST"
else
  node -e '
    const fs = require("fs");
    const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    delete pkg.devDependencies;
    fs.writeFileSync(process.argv[2], JSON.stringify(pkg, null, 2) + "\n");
  ' "${SERVER_DIR}/package.json" "$PRUNED_MANIFEST"
fi
run_command rsync "${RSYNC_OPTIONS[@]}" \
  "$PRUNED_MANIFEST" "${DEPLOY_HOST}:${REMOTE_DIR}/package.json"
run_command rsync "${RSYNC_OPTIONS[@]}" \
  "${SERVER_DIR}/package-lock.json" \
  "${DEPLOY_HOST}:${REMOTE_DIR}/"

log "Sync Caddy and systemd configuration"
run_command rsync "${RSYNC_OPTIONS[@]}" \
  "${SCRIPT_DIR}/Caddyfile" \
  "${SCRIPT_DIR}/${SERVICE_NAME}" \
  "${DEPLOY_HOST}:${REMOTE_DIR}/deploy/"

log "Install production dependencies and activate the service"
run_command ssh "${SSH_OPTIONS[@]}" "$DEPLOY_HOST" "$REMOTE_ACTIVATE"

log "Deploy complete: https://api.excerlock.com/v1/health"
