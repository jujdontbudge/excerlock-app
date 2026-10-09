---
name: api-hosting-gcp
description: "ExcerLock API runs on a GCP free-tier VM (project excerlock, excerlock-api in us-central1-a, static IP 34.134.201.129) since 2026-09-07; Azure VM is dead; deploy via deploy/deploy.sh with gcloud SSH key"
metadata: 
  node_type: memory
  type: project
  originSessionId: a33a4ff3-5d95-4524-ab0d-7082a165ed71
  modified: 2026-09-08T04:18:47.526Z
---

The Azure for Students subscription is disabled (read-only), so the old API VM at 52.157.13.109 cannot be
started. Replacement, provisioned 2026-09-07 via gcloud (logged in as johansardar77@gmail.com, billing
account "My Billing Account 1", no free-trial credits available on this Google account):

- GCP project `excerlock`, VM `excerlock-api`, zone `us-central1-a`, e2-micro (always-free tier), Debian 12,
  static IP `34.134.201.129` (address `excerlock-api-ip`), firewall tag `excerlock-api` (80/443).
- Box has Node 22, Postgres 15 (role/db `excerlock`, TCP password in `/etc/excerlock/env`), Caddy for
  `api.excerlock.com`, 1 GB swap. GCE Debian has no cloud-init; setup was done by SSH script (scratchpad
  vm-setup.sh, mirrors deploy/cloud-init.yaml).
- Deploy: `DEPLOY_HOST=johansardar@34.134.201.129 DEPLOY_SSH_KEY=~/.ssh/google_compute_engine
  bash deploy/deploy.sh` from a CLEAN checkout (never the mid-merge integration worktree).
- `/etc/excerlock/env` carries Supabase (auth-only: URL, JWKS, service role), Adapty, PostHog, Sentry
  API DSN. Health: `/v1/health`.
- DNS at Namecheap done 2026-09-08 via the Chrome extension (the ap.www.namecheap.com block was only a
  hidden-window/zero-size tab; a fresh tab works): A records `api`, `@`, `www` → 34.134.201.129; Resend
  DKIM TXT `resend._domainkey`, `send` TXT spf, `send` MX 10 feedback-smtp.us-east-1.amazonses.com (Mail
  Settings switched to Custom MX; no forwarders existed). api.excerlock.com has a Let's Encrypt cert.
- Website (site/ in repo, static, Caddy file_server at /var/www/excerlock) serves excerlock.com + www:
  privacy, terms, support pages feed the Google consent screen, Adapty paywall legal links, App Store URLs.
- Supabase auth mail goes through Resend SMTP (smtp.resend.com:465, user `resend`, pass = RESEND_API_KEY,
  sender no-reply@excerlock.com); OTP template uses `{{ .Token }}`, 10-minute expiry, 30 mails/hour.

Related: [[clis-over-mcps]], [[rebuild-plan-and-process]].
