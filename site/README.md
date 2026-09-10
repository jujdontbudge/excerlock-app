# excerlock.com — the public site

Four static pages and one stylesheet. No build step, no JavaScript, no images:
the only artwork is an inline SVG padlock. `deploy/site.sh` rsyncs this
directory verbatim to the VM, so what is here is what is live.

| File | URL | Why it exists |
| --- | --- | --- |
| `.well-known/apple-app-site-association` | `/.well-known/apple-app-site-association` | Associates the iOS app; empty paths enable no universal links yet. |
| `index.html` | `/` | Marketing URL for App Store Connect and the homepage the Google OAuth consent screen requires. |
| `privacy.html` | `/privacy.html`, `/privacy` | Privacy policy URL for App Store Connect, the Google OAuth consent screen, and the Adapty paywall. |
| `terms.html` | `/terms.html`, `/terms` | Terms-of-use URL for the Adapty paywall and the Google OAuth consent screen. |
| `support.html` | `/support.html`, `/support` | Support URL for App Store Connect. |
| `style.css` | `/style.css` | Every page loads this one file. |

`README.md` is excluded from the rsync and never reaches the web root.

## The rules this site is written under

- **The privacy policy is derived, not drafted.** Its data table is the app's
  App Privacy filing, whose source of truth is `app-next/release/app-privacy.json`
  and its human-readable derivation `docs/release/app-privacy.md`. Change those
  first; then change `privacy.html` to match. A claim on this page that no code
  supports is a false privacy statement to Apple and to regulators.
- **No generated imagery.** `design/STYLE.md` governs every visual asset in the
  product. This site deliberately owns none, so the framework does not apply to
  it; keep it that way rather than adding an asset that would need to.
- **No prices.** Prices, trial lengths and the plan mix are found through Adapty
  experiments and change without an app release. The site says a subscription
  exists, annual and monthly, with a trial on annual, and points at the App
  Store for the number.
- **Colours mirror the app.** `style.css` restates the brand values from
  `app-next/src/design-system/tokens.ts`. If the app's brand orange changes,
  change it here too.

## Deploy

```sh
DEPLOY_HOST=johansardar@34.134.201.129 \
DEPLOY_SSH_KEY=~/.ssh/google_compute_engine \
  bash deploy/site.sh --dry-run

DEPLOY_HOST=johansardar@34.134.201.129 \
DEPLOY_SSH_KEY=~/.ssh/google_compute_engine \
  bash deploy/site.sh
```

The script creates `/var/www/excerlock` owned by the deploy user and
world-readable, rsyncs this directory into it with `--delete`, stages
`deploy/Caddyfile` in the deploy user's home, validates it, installs it over
`/etc/caddy/Caddyfile`, reloads Caddy, and then curls all four pages plus
`https://api.excerlock.com/v1/health`. A non-200 anywhere fails the deploy.

`--dry-run` prints every rsync and SSH step and changes nothing on either
machine.

## Caddy

`deploy/Caddyfile` holds both vhosts:

- `api.excerlock.com` reverse-proxies the API on `127.0.0.1:3000`.
- `excerlock.com, www.excerlock.com` serves this directory, with
  `try_files {path} {path}.html` so `/privacy` and `/terms` work without the
  extension.

The site block must stay in that file rather than only on the box, because
`deploy/deploy.sh` (the API deploy) installs `deploy/Caddyfile` over
`/etc/caddy/Caddyfile` on every run. A vhost that existed only on the VM would
be erased by the next API deploy.

Caddy obtains and renews certificates for all three names automatically. On the
first deploy after a DNS change, allow up to a minute before the pages answer on
HTTPS.

## Checking it by hand

```sh
for url in https://excerlock.com/ https://excerlock.com/privacy \
           https://excerlock.com/terms https://excerlock.com/support.html \
           https://www.excerlock.com/ https://api.excerlock.com/v1/health; do
  printf '%-42s %s\n' "$url" "$(curl -sS -o /dev/null -w '%{http_code}' "$url")"
done
```

Certificate: `curl -sSI https://excerlock.com/ >/dev/null` fails loudly if it is
invalid. Caddy's own log is `sudo journalctl -u caddy -n 100 --no-pager`.

The deploy validates the AASA payload locally and requires an HTTP 200 JSON response
without redirects after activation. Run deployment inside the app operations lock
from an integrated checkout containing `scripts/agent-ops.py`.
