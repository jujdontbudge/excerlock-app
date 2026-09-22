#!/usr/bin/env bash
# ExcerLock — Azure VM provisioning for the §10.1 server (ticket #19).
#
# Idempotent: every resource is create-if-absent, safe to re-run after a partial
# failure. az CLI only, never the portal (PRD §10.10 / map #1 charting decision).
#
# Prereqs (one-time, human): az login && az account set --subscription <id>;
# an ssh public key at $SSH_KEY_PATH. See docs/research/azure-vps.md.
#
# Usage:
#   ./azure-provision.sh                             # defaults below
#   DOMAIN=api.excerlock.app ./azure-provision.sh    # + Caddyfile domain
#   DOMAIN=api.excerlock.app DNS_ZONE=excerlock.app ./azure-provision.sh  # + Azure DNS

set -euo pipefail

# ── Parameters (override via env) ────────────────────────────────────────────
RG="${RG:-excerlock}"                     # resource group
# Region, size and image are pinned together: the Azure-for-Students subscription
# constrains all three at once (measured 2026-07-30, see azure-vps.md "What the
# subscription actually allows"). An "Allowed resource deployment regions" policy
# limits deployment to mexicocentral/canadacentral/westus/norwayeast/eastus2, and
# within those `az vm list-skus` reports NO unrestricted x86 burstable size at
# all -- eastus2 fails B-series with SkuNotAvailable (Capacity Restrictions).
# The only burstable left is the Ampere ARM64 Bpsv2 family, in westus.
#
# Standard_B2pls_v2 keeps the exact 2 vCPU / 4 GiB burstable shape azure-vps.md
# reasoned about, at ~$21/mo instead of ~$70/mo for the nearest available x86
# (non-burstable D2als_v7). ARM64 is safe for this stack: Node 22, Postgres and
# Caddy all ship arm64 builds for Ubuntu 24.04, and deploy.sh rsyncs transpiled
# `dist/` then runs `npm ci` ON the box, so native deps resolve per-architecture.
LOCATION="${LOCATION:-westus}"            # region (see azure-vps.md rationale)
VM_NAME="${VM_NAME:-excerlock-api}"
VM_SIZE="${VM_SIZE:-Standard_B2pls_v2}"   # 2 vCPU / 4 GiB burstable ARM64, ~$21/mo
OS_DISK_SIZE_GB="${OS_DISK_SIZE_GB:-64}"  # Standard SSD, Postgres shares the OS disk
IMAGE="${IMAGE:-Canonical:ubuntu-24_04-lts:server-arm64:latest}"  # must match VM_SIZE's arch
ADMIN_USER="${ADMIN_USER:-johan}"
SSH_KEY_PATH="${SSH_KEY_PATH:-$HOME/.ssh/id_ed25519.pub}"
DOMAIN="${DOMAIN:-}"                      # e.g. api.excerlock.app (Caddyfile + DNS record)
DNS_ZONE="${DNS_ZONE:-}"                  # e.g. excerlock.app — only if Azure DNS hosts the zone

# Derived names
VNET="${VM_NAME}-vnet"
SUBNET="default"
NSG="${VM_NAME}-nsg"
PIP="${VM_NAME}-ip"
NIC="${VM_NAME}-nic"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLOUD_INIT_SRC="${SCRIPT_DIR}/cloud-init.yaml"

log() { printf '\n▸ %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# ── Preflight ────────────────────────────────────────────────────────────────
command -v az >/dev/null || die "az CLI not found — brew install azure-cli"
[ -f "$SSH_KEY_PATH" ] || die "ssh public key not found at $SSH_KEY_PATH (set SSH_KEY_PATH or ssh-keygen -t ed25519)"
[ -f "$CLOUD_INIT_SRC" ] || die "cloud-init.yaml not found next to this script"
[[ -n "$DOMAIN" ]] ||
  die "DOMAIN is required; refusing to provision a plaintext HTTP API"
[[ "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ && "$DOMAIN" != .* && "$DOMAIN" != *. && "$DOMAIN" != *..* ]] ||
  die "DOMAIN must be a DNS hostname without shell or Caddyfile metacharacters"
az account show >/dev/null 2>&1 || die "not logged in — run: az login && az account set --subscription <id>"
# az CLI encodes --custom-data as latin-1, so a single non-ASCII byte anywhere in
# cloud-init.yaml aborts `az vm create` client-side with an opaque codec error
# ("'latin-1' codec can't encode character ... in position N"). An em dash in a
# comment cost a full provisioning run on 2026-07-30. Fail loudly instead.
if LC_ALL=C grep -qP '[^\x00-\x7F]' "$CLOUD_INIT_SRC" 2>/dev/null; then
  die "cloud-init.yaml contains non-ASCII characters, which az CLI cannot encode into --custom-data. Offending lines:
$(LC_ALL=C grep -nP '[^\x00-\x7F]' "$CLOUD_INIT_SRC")"
fi
if [ -n "$DNS_ZONE" ] && [ -z "$DOMAIN" ]; then die "DNS_ZONE set but DOMAIN empty"; fi

log "subscription: $(az account show --query name -o tsv) · rg=$RG · $LOCATION · $VM_SIZE"

# ── 1. Resource group (az group create is a native upsert) ──────────────────
log "resource group $RG"
az group create --name "$RG" --location "$LOCATION" --output none

# ── 2. NSG + inbound 22/80/443 (Standard-SKU IPs deny all inbound by default,
#       so these rules are what makes the box reachable at all) ──────────────
log "network security group $NSG"
if ! az network nsg show -g "$RG" -n "$NSG" >/dev/null 2>&1; then
  az network nsg create -g "$RG" -n "$NSG" --location "$LOCATION" --output none
  # `create` returning is not the same as the NSG being readable: the rule
  # creates below raced a stale ARM replica and died with ResourceNotFound on
  # 2026-07-30. Block until the resource actually reads back.
  az network nsg wait -g "$RG" -n "$NSG" --created --output none
fi

nsg_rule() { # name port priority
  if ! az network nsg rule show -g "$RG" --nsg-name "$NSG" -n "$1" >/dev/null 2>&1; then
    az network nsg rule create -g "$RG" --nsg-name "$NSG" -n "$1" \
      --priority "$3" --direction Inbound --access Allow --protocol Tcp \
      --destination-port-ranges "$2" --output none
    log "  rule $1 (tcp/$2) created"
  fi
}
nsg_rule Allow-SSH   22  1000
nsg_rule Allow-HTTP  80  1010   # Caddy: ACME challenge + HTTP→HTTPS redirect
nsg_rule Allow-HTTPS 443 1020

# ── 3. Static public IP (Standard SKU — also our explicit outbound method,
#       required since Azure retired default outbound access) ────────────────
log "static public IP $PIP"
if ! az network public-ip show -g "$RG" -n "$PIP" >/dev/null 2>&1; then
  # --location is explicit here (and on the vnet/nic below): these commands
  # otherwise inherit the RESOURCE GROUP's region, not $LOCATION, so pointing an
  # existing RG at a new region would silently strand the network in the old one
  # and fail VM create with a cross-region mismatch.
  az network public-ip create -g "$RG" -n "$PIP" --location "$LOCATION" \
    --sku Standard --allocation-method Static --version IPv4 --output none
fi
PUBLIC_IP="$(az network public-ip show -g "$RG" -n "$PIP" --query ipAddress -o tsv)"

# ── 4. VNet + subnet ─────────────────────────────────────────────────────────
log "vnet $VNET"
if ! az network vnet show -g "$RG" -n "$VNET" >/dev/null 2>&1; then
  az network vnet create -g "$RG" -n "$VNET" --location "$LOCATION" \
    --address-prefixes 10.10.0.0/16 \
    --subnet-name "$SUBNET" --subnet-prefixes 10.10.0.0/24 --output none
fi

# ── 5. NIC wired to subnet + NSG + public IP ─────────────────────────────────
log "nic $NIC"
if ! az network nic show -g "$RG" -n "$NIC" >/dev/null 2>&1; then
  az network nic create -g "$RG" -n "$NIC" --location "$LOCATION" \
    --vnet-name "$VNET" --subnet "$SUBNET" \
    --network-security-group "$NSG" --public-ip-address "$PIP" --output none
fi

# ── 6. Render cloud-init (substitute the Caddy site address) ─────────────────
CADDY_SITE="$DOMAIN"
RENDERED="$(mktemp -t excerlock-cloud-init.XXXXXX)"
trap 'rm -f "$RENDERED"' EXIT
sed "s|%DOMAIN%|${CADDY_SITE}|" "$CLOUD_INIT_SRC" > "$RENDERED"

# ── 7. VM (az vm create is NOT idempotent — guard it) ────────────────────────
log "vm $VM_NAME"
if ! az vm show -g "$RG" -n "$VM_NAME" >/dev/null 2>&1; then
  az vm create -g "$RG" -n "$VM_NAME" \
    --image "$IMAGE" --size "$VM_SIZE" \
    --nics "$NIC" \
    --os-disk-size-gb "$OS_DISK_SIZE_GB" --storage-sku StandardSSD_LRS \
    --admin-username "$ADMIN_USER" --ssh-key-values "$SSH_KEY_PATH" \
    --custom-data "$RENDERED" --output none
  log "  created — cloud-init takes a few minutes on first boot" \
      "(watch: ssh in, then 'cloud-init status --wait')"
else
  log "  already exists — skipping (cloud-init only runs on first boot;" \
      "config changes go through the deploy script)"
fi

# ── 8. Optional: Azure DNS zone + A record ───────────────────────────────────
if [ -n "$DNS_ZONE" ]; then
  log "dns zone $DNS_ZONE"
  if ! az network dns zone show -g "$RG" -n "$DNS_ZONE" >/dev/null 2>&1; then
    az network dns zone create -g "$RG" -n "$DNS_ZONE" --output none
    log "  zone created — point the registrar at these name servers:"
    az network dns zone show -g "$RG" -n "$DNS_ZONE" --query nameServers -o tsv
  fi
  REC="${DOMAIN%."$DNS_ZONE"}"
  [ "$REC" = "$DOMAIN" ] && REC="@"   # apex
  CURRENT="$(az network dns record-set a show -g "$RG" -z "$DNS_ZONE" -n "$REC" \
    --query "aRecords[0].ipv4Address" -o tsv 2>/dev/null || true)"
  if [ "$CURRENT" != "$PUBLIC_IP" ]; then
    az network dns record-set a delete -g "$RG" -z "$DNS_ZONE" -n "$REC" --yes 2>/dev/null || true
    az network dns record-set a add-record -g "$RG" -z "$DNS_ZONE" -n "$REC" \
      --ipv4-address "$PUBLIC_IP" --ttl 300 --output none
    log "  A $DOMAIN → $PUBLIC_IP"
  fi
fi

# ── Done ─────────────────────────────────────────────────────────────────────
log "done"
cat <<SUMMARY

  public IP : $PUBLIC_IP
  ssh       : ssh ${ADMIN_USER}@${PUBLIC_IP}
  caddy site: ${CADDY_SITE}
  next      : ensure the A record for $DOMAIN is live, then Caddy mints TLS on its own
              fill /etc/excerlock/excerlock-api.env (PRD §10.10), rsync-deploy the server, systemctl enable --now excerlock-api

SUMMARY
