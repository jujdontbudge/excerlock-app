# ExcerLock API deployment

The production path is deliberately small: build the `server` workspace
locally, rsync the compiled output and package manifests to one Azure VM,
install production dependencies there, and restart a hardened systemd service
behind Caddy. There is no Docker layer.

## 1. Provision the VM

One-time human prerequisites are an authenticated Azure CLI subscription and an
SSH public key. Review `docs/research/azure-vps.md`, then run this from the
repository root:

```sh
az login
az account set --subscription <subscription-id>
DOMAIN=api.excerlock.com SSH_KEY_PATH="$HOME/.ssh/id_ed25519.pub" \
  ./deploy/azure-provision.sh
```

Ticket #23 owns running provisioning against Azure. The script is idempotent
and prints the static public IP when it finishes. Wait for first-boot setup:

```sh
export DEPLOY_HOST="johan@<public-ip>"
export DEPLOY_SSH_KEY="$HOME/.ssh/id_ed25519"
ssh -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" 'cloud-init status --wait'
```

Create the environment file required by `excerlock-api.service`. The
provisioning template currently creates a legacy
`/etc/excerlock/excerlock-api.env` placeholder; the deployed unit intentionally
uses the ticket #37 contract, `/etc/excerlock/env`.

```sh
ssh -t -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST"

sudo install -d -m 0755 -o root -g root /etc/excerlock
if ! sudo test -e /etc/excerlock/env; then
  sudo install -m 0600 -o root -g root /dev/null /etc/excerlock/env
fi
sudoedit /etc/excerlock/env
sudo chown root:root /etc/excerlock/env
sudo chmod 0600 /etc/excerlock/env
exit
```

Use systemd `EnvironmentFile` syntax: one `KEY=value` per line, without
`export`. At minimum, set the runtime and local Postgres connection; add the
server secrets from PRD §10.10 without ever committing their values:

```dotenv
NODE_ENV=production
HOST=127.0.0.1
PORT=3000
DATABASE_URL=postgres://excerlock@/excerlock?host=/var/run/postgresql
SENTRY_DSN=
CLERK_SECRET_KEY=
POSTHOG_API_KEY=
POSTHOG_HOST=https://us.i.posthog.com
```

## 2. Point DNS at the VM

Create an `A` record:

```text
api.excerlock.com  A  <Azure static public IP>
```

Do not add an `AAAA` record unless the VM has working public IPv6. Confirm the
record resolves to the VM before the first deploy:

```sh
dig +short api.excerlock.com A
```

The Azure network security group must allow TCP 80 and 443. Once DNS is live,
the deployed `Caddyfile` proxies `api.excerlock.com` to `127.0.0.1:3000`;
Caddy obtains and renews the TLS certificate automatically.

## 3. First deploy and later deploys

Run from any directory. `DEPLOY_HOST` is the SSH destination and
`DEPLOY_SSH_KEY` is its private key, not the `.pub` file. Use
`DEPLOY_SSH_PORT` only when SSH is not on port 22.

```sh
export DEPLOY_HOST="johan@<public-ip>"
export DEPLOY_SSH_KEY="$HOME/.ssh/id_ed25519"

./deploy/deploy.sh --dry-run
./deploy/deploy.sh
```

Always inspect the dry run first. It validates local prerequisites and prints
every command without building, opening an SSH connection, running rsync, or
changing either machine. A real deploy then:

1. checks key-based SSH, passwordless sudo, and `/etc/excerlock/env`;
2. runs `npm run build --workspace server` locally;
3. rsyncs `server/dist/`, `server/package.json`, and
   `server/package-lock.json` to `/opt/excerlock/server`;
4. runs `npm ci --omit=dev` as the `excerlock` user;
5. validates and installs the Caddy/systemd files, reloads Caddy, restarts
   `excerlock-api.service`, and waits for the local `/v1/health` check.

Re-running the same revision is safe: rsync converges the built files,
`npm ci` recreates dependencies from the lockfile, config installation is
replace-in-place, and systemd restart is idempotent.

## 4. Status and logs

Public and local health checks:

```sh
curl --fail --show-error https://api.excerlock.com/v1/health
ssh -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" \
  'curl --fail --show-error http://127.0.0.1:3000/v1/health'
```

Service status and recent logs:

```sh
ssh -t -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" \
  'sudo systemctl --no-pager --full status excerlock-api.service'
ssh -t -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" \
  'sudo journalctl -u excerlock-api.service -n 200 --no-pager'
ssh -t -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" \
  'sudo journalctl -u caddy -n 200 --no-pager'
```

For a live tail, replace `-n 200 --no-pager` with `-f`.

## 5. Rollback

Deploys do not mutate the database schema. Roll back application code by
redeploying a known-good Git revision; its lockfile also restores the matching
production dependencies. A separate worktree avoids disturbing local work:

```sh
git worktree add ../excerlock-rollback <known-good-commit>
cd ../excerlock-rollback

DEPLOY_HOST="$DEPLOY_HOST" DEPLOY_SSH_KEY="$DEPLOY_SSH_KEY" \
  ./deploy/deploy.sh --dry-run
DEPLOY_HOST="$DEPLOY_HOST" DEPLOY_SSH_KEY="$DEPLOY_SSH_KEY" \
  ./deploy/deploy.sh

cd -
git worktree remove ../excerlock-rollback
```

Choose a known-good revision at or after ticket #37 so it contains this deploy
tooling. If the first-ever deploy has no earlier application revision, stop the
service while investigating:

```sh
ssh -t -i "$DEPLOY_SSH_KEY" "$DEPLOY_HOST" \
  'sudo systemctl stop excerlock-api.service'
```
