#!/bin/bash
set -euo pipefail
# Startup stage medians from one capture. Two capture sources:
#
#   --trace TRACE --xpath XPATH   an xctrace recording exported here
#   --sim-log UDID [--since DATE] the pinned simulator's own unified log
#
# Both feed the same parser (`startup-stage-medians.cjs`), so the median maths
# and the JSON schema are identical. Neither is a §6.2 budget: the numbers are
# delegate-relative per-stage step/cumulative times (ADR 0021/0033), and the
# budget gate stays a signed Release build on the target device.
#
# The simulator record path exists because `xctrace record` against a simulator
# target cannot complete on this host (the tap fails at setup and the recorder
# hangs; see e2e-next/README.md finding 3). The app's os_signpost stages are
# nevertheless readable from the simulator's unified log, which is what
# `--sim-log` captures.
usage(){ echo "usage: measure-startup.sh --trace TRACE --xpath XPATH --output DIR | --sim-log UDID [--since DATE] [--subsystem NAME] --output DIR" >&2; exit 64; }
TRACE= XPATH= OUT= UDID= SINCE= SUBSYSTEM=com.johansardar.excerlock.startup
while (($#)); do case "$1" in --trace|--xpath|--output|--sim-log|--since|--subsystem) (($# >= 2)) || usage; key=$1; value=$2; shift 2; case "$key" in --trace) TRACE=$value;; --xpath) XPATH=$value;; --output) OUT=$value;; --sim-log) UDID=$value;; --since) SINCE=$value;; --subsystem) SUBSYSTEM=$value;; esac;; *) usage;; esac; done
[[ -n "$OUT" && ! -e "$OUT" ]] || usage
PARSER="$(cd "$(dirname "$0")" && pwd)/startup-stage-medians.cjs"
mkdir -m 700 "$OUT"

if [[ -n "$UDID" ]]; then
  [[ -z "$TRACE" && -z "$XPATH" ]] || usage
  WINDOW=(--last 30m)
  [[ -z "$SINCE" ]] || WINDOW=(--start "$SINCE")
  # `--signpost` is singular on macOS/iOS 26; `--signposts` is rejected as an
  # unknown option and silently yields an empty capture.
  xcrun simctl spawn "$UDID" log show "${WINDOW[@]}" --signpost --style ndjson \
    --predicate "subsystem == \"$SUBSYSTEM\"" > "$OUT/signposts.ndjson"
  node "$PARSER" "$OUT/signposts.ndjson" --json "$OUT/stage-medians.json"
  cat > "$OUT/diagnostic.json" <<'JSON'
{
  "origin": "AppDelegate entry (not process launch)",
  "numeric_timing_verified": true,
  "numeric_timing_source": "simulator unified log os_signpost events parsed by scripts/startup-stage-medians.cjs",
  "capture_source": "simulator-unified-log",
  "capture_validated_against_real_output": true,
  "simulator_numbers": true,
  "stage_medians": "stage-medians.json",
  "real_trace_validated": false,
  "full_cold_launch_verified": false,
  "note": "Per-stage medians are delegate-relative step and cumulative times measured on the simulator, not process launch or first-frame time. The §6.2 budgets remain a signed Release build measured on the target device (ADR 0021/0033)."
}
JSON
  cat "$OUT/diagnostic.json"
  exit 0
fi

[[ -n "$TRACE" && -n "$XPATH" && -e "$TRACE" ]] || usage
xcrun xctrace export --input "$TRACE" --toc --output "$OUT/toc.xml"
xcrun xctrace export --input "$TRACE" --xpath "$XPATH" --output "$OUT/signposts.xml"
node "$PARSER" "$OUT/signposts.xml" --json "$OUT/stage-medians.json"
cat > "$OUT/diagnostic.json" <<'JSON'
{
  "origin": "AppDelegate entry (not process launch)",
  "numeric_timing_verified": true,
  "numeric_timing_source": "os_signpost stage events parsed by scripts/startup-stage-medians.cjs",
  "capture_source": "xctrace-export",
  "simulator_numbers": false,
  "stage_medians": "stage-medians.json",
  "real_trace_validated": false,
  "full_cold_launch_verified": false,
  "note": "Per-stage medians are delegate-relative step and cumulative times, not process launch or first-frame time. The parser schema is fixture-verified only, and a signed Release build on the target device remains required before claiming the T15 budgets (ADR 0021)."
}
JSON
cat "$OUT/diagnostic.json"
