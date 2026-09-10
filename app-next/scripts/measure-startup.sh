#!/bin/bash
set -euo pipefail
usage(){ echo "usage: measure-startup.sh --trace TRACE --xpath XPATH --output DIR" >&2; exit 64; }
TRACE= XPATH= OUT=
while (($#)); do case "$1" in --trace|--xpath|--output) (($# >= 2)) || usage; key=$1; value=$2; shift 2; case "$key" in --trace) TRACE=$value;; --xpath) XPATH=$value;; --output) OUT=$value;; esac;; *) usage;; esac; done
[[ -n "$TRACE" && -n "$XPATH" && -n "$OUT" && -e "$TRACE" && ! -e "$OUT" ]] || usage
mkdir -m 700 "$OUT"
xcrun xctrace export --input "$TRACE" --toc --output "$OUT/toc.xml"
xcrun xctrace export --input "$TRACE" --xpath "$XPATH" --output "$OUT/signposts.xml"
cat > "$OUT/diagnostic.json" <<'JSON'
{
  "origin": "AppDelegate entry (not process launch)",
  "numeric_timing_verified": false,
  "full_cold_launch_verified": false,
  "note": "Raw xctrace export only; numeric parsing requires a validated export schema fixture."
}
JSON
echo "Raw diagnostic export only: numeric timing and full process cold launch remain unverified."
cat "$OUT/diagnostic.json"
