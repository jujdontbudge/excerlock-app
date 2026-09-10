#!/usr/bin/env bash
set -euo pipefail
cd /Users/johansardar/ExcerLock-build/ship-site
[[ "$(git rev-parse HEAD)" == 02a660d625bb9622fa5ad6fbc18a2eb868ba4cba ]]
[[ -z "$(git status --porcelain)" ]]
python3 deploy/validate-aasa.py site/.well-known/apple-app-site-association
ssh_args=(-i "$HOME/.ssh/google_compute_engine" -o BatchMode=yes -o ConnectTimeout=10 -o StrictHostKeyChecking=yes johansardar@34.134.201.129)
expected=$(git show ff8fed59ddbc4d5c6c1c715045c748e87726b40f:deploy/Caddyfile | shasum -a 256 | awk '{print $1}')
actual=$(ssh "${ssh_args[@]}" 'sudo -n sha256sum /etc/caddy/Caddyfile' | awk '{print $1}')
[[ "$actual" == "$expected" ]] || { echo 'Live Caddy configuration drift; refusing deployment' >&2; exit 1; }
stage=$(ssh "${ssh_args[@]}" 'mktemp -d /tmp/excerlock-aasa.XXXXXXXX')
[[ "$stage" =~ ^/tmp/excerlock-aasa\.[A-Za-z0-9]+$ ]]
ssh "${ssh_args[@]}" "cat > '$stage/Caddyfile'" < deploy/Caddyfile
ssh "${ssh_args[@]}" "cat > '$stage/apple-app-site-association'" < site/.well-known/apple-app-site-association
ssh "${ssh_args[@]}" "sudo -n bash -s -- '$stage' '$expected'" <<'REMOTE'
set -euo pipefail
stage=$1
expected=$2
config=/etc/caddy/Caddyfile
asset=/var/www/excerlock/.well-known/apple-app-site-association
# Serialize this endpoint deployment on the host, and reject any changed baseline.
exec 9>/run/lock/excerlock-aasa.lock
flock -n 9
[[ "$(sha256sum "$config" | awk '{print $1}')" == "$expected" ]]
[[ ! -e "$asset" && ! -L "$asset" ]] || { echo 'AASA already exists; refusing overwrite' >&2; exit 1; }
[[ ! -L /var/www/excerlock/.well-known ]]
caddy validate --config "$stage/Caddyfile" --adapter caddyfile
backup="/etc/caddy/Caddyfile.aasa-backup.$(date -u +%Y%m%dT%H%M%SZ).$$"
cp -p "$config" "$backup"
changed=false
rollback() {
  status=$?
  trap - EXIT
  if $changed; then
    echo "Deployment failed; restoring $backup" >&2
    install -m 0644 -o root -g root "$backup" /etc/caddy/.Caddyfile.aasa-restore
    mv -f /etc/caddy/.Caddyfile.aasa-restore "$config"
    rm -f "$asset"
    systemctl reload caddy || echo 'ERROR: restored configuration reload failed' >&2
  fi
  exit "$status"
}
trap rollback EXIT
install -d -m 0755 /var/www/excerlock/.well-known
install -m 0644 -o root -g root "$stage/apple-app-site-association" /var/www/excerlock/.well-known/.aasa-pending
install -m 0644 -o root -g root "$stage/Caddyfile" /etc/caddy/.Caddyfile.aasa-pending
changed=true
mv -f /var/www/excerlock/.well-known/.aasa-pending "$asset"
mv -f /etc/caddy/.Caddyfile.aasa-pending "$config"
systemctl reload caddy
systemctl is-active --quiet caddy
response=$(curl --silent --show-error --max-time 20 --output "$stage/aasa-response" --write-out '%{http_code} %{content_type}' https://excerlock.com/.well-known/apple-app-site-association)
[[ "$response" == '200 application/json' ]]
cmp "$stage/apple-app-site-association" "$stage/aasa-response"
for url in https://excerlock.com/ https://excerlock.com/privacy https://excerlock.com/terms https://excerlock.com/support.html https://www.excerlock.com/ https://api.excerlock.com/v1/health; do
  status=$(curl --silent --show-error --max-time 20 --output /dev/null --write-out '%{http_code}' "$url")
  [[ "$status" == 200 ]] || { echo "Health check failed: $url ($status)" >&2; exit 1; }
done
changed=false
trap - EXIT
printf 'AASA deployed and verified; prior Caddy configuration retained at %s\n' "$backup"
REMOTE
