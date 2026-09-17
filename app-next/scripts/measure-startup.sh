#!/bin/bash
set -euo pipefail
usage(){ echo "usage: measure-startup.sh --trace TRACE --xpath XPATH --output DIR" >&2; exit 64; }
TRACE= XPATH= OUT=
while (($#)); do case "$1" in --trace|--xpath|--output) (($# >= 2)) || usage; key=$1; value=$2; shift 2; case "$key" in --trace) TRACE=$value;; --xpath) XPATH=$value;; --output) OUT=$value;; esac;; *) usage;; esac; done
[[ -n "$TRACE" && -n "$XPATH" && -n "$OUT" && -e "$TRACE" && ! -e "$OUT" ]] || usage
mkdir -m 700 "$OUT"
xcrun xctrace export --input "$TRACE" --toc --output "$OUT/toc.xml"
xcrun xctrace export --input "$TRACE" --xpath "$XPATH" --output "$OUT/signposts.xml"
node "$(cd "$(dirname "$0")" && pwd)/startup-stage-medians.cjs" "$OUT/signposts.xml" --json "$OUT/stage-medians.json"
cat > "$OUT/diagnostic.json" <<'JSON'
{
  "origin": "AppDelegate entry (not process launch)",
  "numeric_timing_verified": true,
  "numeric_timing_source": "os_signpost stage events parsed by scripts/startup-stage-medians.cjs",
  "stage_medians": "stage-medians.json",
  "real_trace_validated": false,
  "full_cold_launch_verified": false,
  "note": "Per-stage medians are delegate-relative step and cumulative times, not process launch or first-frame time. The parser schema is fixture-verified only, and a signed Release build on the target device remains required before claiming the T15 budgets (ADR 0021)."
}
JSON
cat "$OUT/diagnostic.json"
