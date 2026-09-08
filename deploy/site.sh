#!/usr/bin/env bash
# ExcerLock public site deploy: rsync site/ to /var/www/excerlock on the VM,
# install the Caddyfile, validate it, reload Caddy. Run from anywhere; paths
# resolve from this file. There is no build step — site/ is what ships.

set -euo pipefail

DRY_RUN=false
DEPLOY_HOST="${DEPLOY_HOST:-}"
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY:-}"
DEPLOY_SSH_PORT="${DEPLOY_SSH_PORT:-22}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SITE_DIR="${REPO_ROOT}/site"
REMOTE_ROOT="/var/www/excerlock"

usage() {
  cat <<'EOF'
Usage: DEPLOY_HOST=user@host DEPLOY_SSH_KEY=/absolute/path/to/key bash deploy/site.sh [--dry-run]

Environment:
  DEPLOY_HOST      SSH destination, normally johansardar@34.134.201.129 (required).
  DEPLOY_SSH_KEY   Private key authorized for DEPLOY_HOST (required).
  DEPLOY_SSH_PORT  SSH port (optional; defaults to 22).

Options:
  --dry-run  Print every rsync and SSH step without executing it.
  -h, --help Show this help.
EOF
}

log() { printf '\n▸ %s\n' "$*"; }

die() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
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

while (($# > 0)); do
  case "$1" in
    --dry-run) DRY_RUN=true ;;
    -h | --help)
      usage
      exit 0
      ;;
    *) die "unknown argument: $1 (expected --dry-run or --help)" ;;
  esac
  shift
done

[[ -n "$DEPLOY_HOST" ]] ||
  die "DEPLOY_HOST is required (example: export DEPLOY_HOST=johansardar@34.134.201.129)"
[[ -n "$DEPLOY_SSH_KEY" ]] ||
  die "DEPLOY_SSH_KEY is required (set it to the private key authorized on DEPLOY_HOST)"
[[ "$DEPLOY_HOST" =~ ^([A-Za-z0-9._-]+@)?[A-Za-z0-9.-]+$ ]] ||
  die "DEPLOY_HOST must be a hostname or user@hostname without spaces or shell metacharacters"
if [[ ! "$DEPLOY_SSH_PORT" =~ ^[0-9]+$ ]] ||
  ((DEPLOY_SSH_PORT < 1 || DEPLOY_SSH_PORT > 65535)); then
  die "DEPLOY_SSH_PORT must be an integer from 1 to 65535"
fi

# ~ in DEPLOY_SSH_KEY survives an unquoted assignment but not a quoted one.
DEPLOY_SSH_KEY="${DEPLOY_SSH_KEY/#\~/$HOME}"
[[ -f "$DEPLOY_SSH_KEY" ]] || die "DEPLOY_SSH_KEY does not name a file: $DEPLOY_SSH_KEY"
[[ -r "$DEPLOY_SSH_KEY" ]] || die "DEPLOY_SSH_KEY is not readable: $DEPLOY_SSH_KEY"

[[ -f "${SITE_DIR}/index.html" ]] || die "site/index.html not found under $REPO_ROOT"
[[ -f "${SITE_DIR}/privacy.html" ]] || die "site/privacy.html not found"
[[ -f "${SITE_DIR}/terms.html" ]] || die "site/terms.html not found"
[[ -f "${SITE_DIR}/support.html" ]] || die "site/support.html not found"
[[ -f "${SCRIPT_DIR}/Caddyfile" ]] || die "deploy/Caddyfile not found"

command -v rsync >/dev/null 2>&1 || die "rsync is required but was not found in PATH"
command -v ssh >/dev/null 2>&1 || die "ssh is required but was not found in PATH"

SSH_OPTIONS=(
  -i "$DEPLOY_SSH_KEY"
  -p "$DEPLOY_SSH_PORT"
  -o BatchMode=yes
  -o ConnectTimeout=10
  -o IdentitiesOnly=yes
  -o StrictHostKeyChecking=accept-new
)
printf -v RSYNC_SSH 'ssh -i %q -p %q -o BatchMode=yes -o ConnectTimeout=10 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new' \
  "$DEPLOY_SSH_KEY" "$DEPLOY_SSH_PORT"

# The deploy user owns the web root so rsync needs no sudo; Caddy reads it as
# nobody, which is why every file lands world-readable.
REMOTE_PREPARE="set -eu
sudo -n true || {
  printf 'ERROR: the deploy user needs passwordless sudo on DEPLOY_HOST\n' >&2
  exit 1
}
sudo install -d -m 0755 -o root -g root /var/www
sudo install -d -m 0755 -o \"\$(id -un)\" -g \"\$(id -gn)\" ${REMOTE_ROOT}
mkdir -p \"\$HOME/.excerlock-site\""

# Caddy reads the web root as an unprivileged user, so every file it serves has
# to be world-readable no matter what mode the local checkout carried.
REMOTE_PUBLISH="set -eu
find ${REMOTE_ROOT} -type d -exec chmod 0755 {} +
find ${REMOTE_ROOT} -type f -exec chmod 0644 {} +"

REMOTE_ACTIVATE="set -eu
# Validate before installing: an invalid file must never reach /etc/caddy,
# because the next reload of a working API would then fail too.
sudo caddy validate --config \"\$HOME/.excerlock-site/Caddyfile\" --adapter caddyfile
sudo install -m 0644 -o root -g root \"\$HOME/.excerlock-site/Caddyfile\" /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl is-active --quiet caddy"

if "$DRY_RUN"; then
  printf 'Dry run requested; no commands will execute.\n'
fi

log "Create ${REMOTE_ROOT} and check passwordless sudo"
if ! run_command ssh "${SSH_OPTIONS[@]}" "$DEPLOY_HOST" "$REMOTE_PREPARE"; then
  die "SSH preflight failed for $DEPLOY_HOST; verify DEPLOY_SSH_KEY and passwordless sudo"
fi

log "Sync site/ to ${REMOTE_ROOT}"
# No --chmod: macOS ships openrsync, which rejects it. Modes are set on the
# box instead, in REMOTE_PUBLISH below.
run_command rsync -rlptz --itemize-changes --delete \
  --exclude 'README.md' \
  -e "$RSYNC_SSH" \
  "${SITE_DIR}/" "${DEPLOY_HOST}:${REMOTE_ROOT}/"

# Staged in the deploy user's home, never under the web root: anything inside
# ${REMOTE_ROOT} is publicly served, and the Caddyfile is configuration.
log "Make the web root world-readable"
run_command ssh "${SSH_OPTIONS[@]}" "$DEPLOY_HOST" "$REMOTE_PUBLISH"

log "Stage the Caddyfile"
run_command rsync -ptz --itemize-changes \
  -e "$RSYNC_SSH" \
  "${SCRIPT_DIR}/Caddyfile" "${DEPLOY_HOST}:.excerlock-site/Caddyfile"

log "Validate the Caddyfile and reload Caddy"
run_command ssh "${SSH_OPTIONS[@]}" "$DEPLOY_HOST" "$REMOTE_ACTIVATE"

if ! "$DRY_RUN"; then
  log "Verify the live pages"
  for path in / /privacy.html /terms.html /support.html /privacy /terms; do
    # A connection failure makes curl print nothing, so the substitution has to
    # supply the placeholder rather than append one to a partial code.
    status="$(curl --silent --location --max-time 20 \
      --output /dev/null --write-out '%{http_code}' "https://excerlock.com${path}")" || status=000
    printf '  %-16s %s\n' "$path" "$status"
    [[ "$status" == "200" ]] ||
      die "https://excerlock.com${path} returned ${status}; Caddy may still be issuing the certificate — retry in a minute"
  done
  api_status="$(curl --silent --max-time 20 \
    --output /dev/null --write-out '%{http_code}' https://api.excerlock.com/v1/health)" || api_status=000
  printf '  %-16s %s\n' "api /v1/health" "$api_status"
  [[ "$api_status" == "200" ]] || die "the API health check returned ${api_status}; the Caddy reload may have broken it"
fi

log "Site deployed: https://excerlock.com/"
