# Azure VM for the §10.1 server — size, region, cost, provisioning (#19)

**Researched:** 2026-07-28 · **Decision context:** PRD §10.1 (Fastify + Drizzle + Postgres on one box, rsync → systemd → Caddy auto-TLS, no Docker) · §10.10 (CLI-first, secrets in `EnvironmentFile`). VPS provider was locked to **Azure via `az` CLI** at charting (map #1).

## Recommendation (TL;DR)

**`Standard_B2als_v2` in `eastus2`, 64 GiB Standard SSD, static Standard-SKU public IP. ≈ $36/month pay-as-you-go.**

Provision with `deploy/azure-provision.sh` (idempotent, az-CLI-only, cloud-init installs Node 22 + Postgres + Caddy + the `excerlock-api.service` skeleton). Do not run it until Johan has done the one-time steps below.

## Why this size

The workload is a single small always-on Fastify API + Postgres on the same box: OAuth token-exchange proxy, Adapty webhook mirror, server-side PostHog, Resend email, `setInterval` cron sweeps. Traffic is webhook- and OAuth-shaped — bursty, low sustained CPU. That is the textbook burstable (B-family) profile.

**Bsv2/Basv2 (2022 gen) over the original B-series:** same CPU-credit model, but Microsoft quotes up to 15 % better price-performance, ~5× network bandwidth, and ~10× remote-storage throughput; the original B-series runs on much older hardware at nearly the same price. No reason to pick original-B for a new deployment. The AMD variant (`B2als_v2`, Basv2 series) is ~10 % cheaper than the Intel `B2ls_v2` with identical vCPU/RAM — nothing in our stack is Intel-specific.

| Size | vCPU / RAM | Baseline CPU | ~$/mo (eastus2, PAYG) | Verdict |
|---|---|---|---|---|
| `B2ts_v2` | 2 / 1 GiB | 20 % | ~$8 | Too small — 1 GiB can't hold Postgres + Node comfortably |
| **`B2als_v2`** (AMD) | 2 / 4 GiB | 30 % | **~$27** | **Pick.** 4 GiB fits Postgres (+shared buffers) + Node 22 + Caddy with headroom |
| `B2ls_v2` (Intel) | 2 / 4 GiB | 30 % | ~$30 | Same specs, ~10 % dearer; fallback if AMD capacity is missing in-region |
| `B2s_v2` | 2 / 8 GiB | 40 % | ~$56 | Upgrade path if Postgres working set grows — resize in place, no rebuild |

Credit model note: below the baseline (≈30 % per vCPU) the VM banks credits; bursts spend them at up to 100 % of both vCPUs. Webhook/OAuth traffic sits near-idle almost always, so the bank stays full — this is not a throttling risk for us. If sustained CPU ever becomes the norm (it shouldn't — earning logic stays on-device per §10.1), resize to a D-family.

## Region: `eastus2`

- Johan operates on US Eastern time → lowest-latency ssh/rsync deploys.
- API latency to end users barely matters: the client talks to this server rarely (OAuth exchange, occasional syncs); webhook senders (Adapty, Strava et al.) are US-hosted.
- `eastus2` is in Azure's cheapest US price tier, has full Bsv2/Basv2 availability and the deepest capacity pools. Fallbacks if a size is capacity-constrained at create time: `eastus`, `centralus` (same price tier).

## What the subscription actually allows (measured 2026-07-30, ticket #23)

The section above reasons about Azure's public catalogue. The **Azure for Students** subscription we deploy on (`bcfb0381-…`, University of Illinois tenant) is narrower on both axes, and provisioning failed twice before this was understood:

- **Region.** A subscription-scoped policy assignment, *"Allowed resource deployment regions"*, permits only `mexicocentral`, `canadacentral`, `westus`, `norwayeast`, `eastus2`. Anything else fails with `RequestDisallowedByAzure` — that killed a `northcentralus` attempt after `az vm list-skus` had reported the size available there.
- **Size.** Inside those regions there is **no unrestricted x86 burstable size at all**. `eastus2` rejects the whole B family with `SkuNotAvailable` ("Capacity Restrictions"); the other allowed regions expose only the Ampere **ARM64** `Bpsv2` family as burstable. Every x86 option left is a non-burstable D/F size at roughly triple the price.

**Resulting deployment: `Standard_B2pls_v2` (2 vCPU / 4 GiB, ARM64) in `westus`, ~$21/mo** — the same burstable shape this document argues for, one price tier cheaper than `B2als_v2`, versus ~$70/mo for the nearest available x86 (`D2als_v7`).

ARM64 is safe for the §10.1 stack: Node 22, Postgres and Caddy all ship arm64 builds for Ubuntu 24.04, and `deploy/deploy.sh` rsyncs only transpiled `dist/` and then runs `npm ci` **on the box**, so native dependencies resolve per-architecture. The VM image must track the size's architecture — `Canonical:ubuntu-24_04-lts:server-arm64:latest`.

Re-check with `az vm list-skus -l <region> --resource-type virtualMachines --all` before assuming a size is obtainable; the public catalogue is not the subscription's catalogue. If the x86 B-series ever opens up in an allowed region, `VM_SIZE` + `IMAGE` are the only two knobs to change.

## Disk

**64 GiB Standard SSD (E6) OS disk, ≈ $4.80/mo.** One disk, no data disk: Postgres data lives on the OS disk — at our scale (user records, token store, subscription mirror; **no** raw vendor data per #18, **no** server-side balances per §10.1) the DB is megabytes, not gigabytes. Standard SSD is fine for this I/O; Premium SSD (P6, ~$10/mo) is the knob if p99 write latency ever shows up in Sentry. Default Ubuntu images come with a 30 GiB disk; 64 GiB buys log/WAL headroom for pennies.

## Monthly cost (eastus2, pay-as-you-go, July 2026 prices)

| Item | ~$/month |
|---|---|
| `Standard_B2als_v2` (730 h) | 27.45 |
| 64 GiB Standard SSD (E6) OS disk | 4.80 |
| Static public IP (Standard SKU) | 3.65 |
| Egress (first 100 GB/mo free; our API traffic is far below) | ~0 |
| **Total** | **≈ $36** |

Cost levers, in order of bother:
1. **1-yr savings plan / reservation** on the VM: ~30–40 % off compute (~$17–19/mo) — do this once the box has been stable for a month, via `az reservations` or the savings-plan API, not the portal.
2. **New-account free tier**: 750 h/mo of `B2ts_v2`/`B2ats_v2`/`B2pts_v2` free for 12 months — irrelevant here (1 GiB RAM) unless Johan opens a fresh subscription and wants a free staging box.

## What Johan must do once (human steps, then agents take over)

1. `az login` — browser pops once; thereafter the CLI token refreshes silently. (On a headless box: `az login --use-device-code`.)
2. Pick the subscription: `az account list -o table` → `az account set --subscription <id>`.
3. Have an ssh key at `~/.ssh/id_ed25519.pub` (or set `SSH_KEY_PATH`). Generate with `ssh-keygen -t ed25519` if missing.
4. Decide the API hostname (e.g. `api.excerlock.app`). If the zone should live in Azure DNS, set `DNS_ZONE`+`DOMAIN` when running the script and point the registrar at the four Azure name servers it prints; if DNS stays at the registrar, just create an A record → the static IP the script prints. Caddy needs the A record live before it can mint TLS.
5. Run `deploy/azure-provision.sh` (safe to re-run; every step is create-if-absent).

Everything after that — rsync deploys, `EnvironmentFile` secrets, Postgres app-role password — is the VPS task's job, per §10.10 (ssh key → `~/.ssh`, DB URL + server secrets → systemd `EnvironmentFile`, never committed).

## Azure quirks that bit people (so they don't bite us)

- **Default outbound access is retired.** Since 30 Sep 2025 (behavioral cutover completing for API versions after 31 Mar 2026), new VMs get **no** implicit outbound internet — you must attach an explicit outbound method (public IP, NAT Gateway, or LB outbound rules). Our script attaches a static Standard-SKU public IP directly to the NIC, which satisfies this. Symptom if you forget: cloud-init hangs forever pulling apt packages.
- **Standard-SKU public IPs are secure-by-default**: *all* inbound is blocked until an NSG explicitly allows it. So the NSG with 22/80/443 rules isn't optional hardening — without it the box is unreachable. (Basic SKU, which defaulted open, is itself retired since Sep 2025.)
- **NSG default rules** already allow all *outbound* and intra-VNet traffic; we only add inbound 22/80/443. Port 5432 stays closed — Postgres listens on localhost only, which is also why the box needs no `pg_hba` exposure work.
- **vCPU quota:** fresh subscriptions get a default regional quota (typically 10 vCPU per family) — `B2als_v2` uses 2, so fine, but a brand-new subscription occasionally starts a family at 0. Check: `az vm list-usage -l eastus2 -o table | grep -i basv2`; request more via `az quota` if needed.
- **`az vm create` is not idempotent** (second run errors) — the script guards every resource with a `show || create` check instead.
- **Cloud-init runs once, on first boot only.** Config drift after that is deploy-script territory. If cloud-init needs changing, delete and re-provision the VM (cheap, since app state deploys via rsync and the DB should be dumped/restored — or just don't change it).
- **Caddy + TLS:** ports 80 *and* 443 must both be open (80 for the ACME HTTP challenge and redirects). The Caddyfile is written by cloud-init with the real domain substituted in; if `DOMAIN` was left empty it writes a placeholder that serves plain HTTP on the IP until edited.

## Files

- `deploy/azure-provision.sh` — idempotent az-CLI provisioning (RG → NSG → static IP → VNet/NIC → VM with cloud-init). Parameterized via env vars at the top; **review-only so far, deliberately not yet run** (that's the VPS task).
- `deploy/cloud-init.yaml` — first-boot config: Node 22 (NodeSource), Postgres (Ubuntu 24.04 → PG 16), Caddy (official apt repo), `excerlock` system user, `/etc/excerlock/excerlock-api.env` EnvironmentFile placeholder (0600), `excerlock-api.service` systemd skeleton, Caddyfile.

## Sources

- [Bsv2-series sizes — Microsoft Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/bsv2-series)
- [B family VM size series — Microsoft Learn](https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/general-purpose/b-family)
- [Announcing Bsv2/Basv2/Bpsv2 — Azure Compute blog](https://techcommunity.microsoft.com/blog/azurecompute/announcing-public-preview-of-new-burstable-vms---bsv2-basv2-and-bpsv2/3868024)
- [B2als v2 pricing — Vantage](https://instances.vantage.sh/azure/vm/b2als-v2) · [B2ls v2](https://instances.vantage.sh/azure/vm/b2ls-v2) · [B2s v2](https://instances.vantage.sh/azure/vm/b2s-v2) · [B2ts v2](https://instances.vantage.sh/azure/vm/b2ts-v2)
- [Default outbound access retirement — Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/2279183/azure-outbound-access-retirement-add-explicit-outb) · [transition guidance](https://learn.microsoft.com/en-us/answers/questions/1382414/default-outbound-access-for-vms-in-azure-will-be-r)
