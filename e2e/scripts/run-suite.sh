#!/usr/bin/env bash
# ============================================================================
# run-suite.sh — functional pass of the e2e loop (HARNESS.md §2).
# Runs the Maestro suite against the pinned simulator, writes JUnit XML +
# per-flow artifact bundles, exits with a loop-readable code.
#
# Usage:
#   run-suite.sh                      # full suite, visual+wip tags excluded
#   run-suite.sh --tags home          # one surface
#   run-suite.sh --flow flows/x.yaml  # a single flow (fast re-check of a fix)
#   run-suite.sh --with-visual        # include assertScreenshot steps
#
# Exit codes:
#   0  all flows passed
#   1  >=1 flow failed — read out/report.xml, then the failing flows'
#      artifact bundles in out/artifacts/ (screenshot + view hierarchy)
#   2  environment not ready (maestro / pinned sim / build missing)
#
# ============================================================================
set -euo pipefail

# ---- app identifiers --------------------------------------------------------
APP_BUNDLE_ID="${APP_BUNDLE_ID:-com.johansardar.excerlock}"
APP_BINARY="${APP_BINARY:-}"          # release-style e2e .app; empty = use installed build
SIM_NAME="${SIM_NAME:-ExcerLock-E2E}" # pinned device (HARNESS.md §6.1)

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$E2E_DIR/out"
TARGET="$E2E_DIR/flows"
INCLUDE_TAGS=""
EXCLUDE_TAGS="visual,wip"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tags)
      if [[ $# -lt 2 || -z "$2" ]]; then
        echo "run-suite.sh: --tags requires a value" >&2
        exit 2
      fi
      INCLUDE_TAGS="$2"
      shift 2
      ;;
    --flow)
      if [[ $# -lt 2 || -z "$2" ]]; then
        echo "run-suite.sh: --flow requires a value" >&2
        exit 2
      fi
      case "$2" in
        /*) TARGET="$2" ;;
        flows/*) TARGET="$E2E_DIR/$2" ;;
        *) TARGET="$E2E_DIR/flows/$2" ;;
      esac
      shift 2
      ;;
    --with-visual)
      EXCLUDE_TAGS="wip"
      shift
      ;;
    *)
      echo "run-suite.sh: unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

# ---- environment checks (exit 2) -------------------------------------------
if ! command -v maestro >/dev/null 2>&1; then
  echo "run-suite.sh: maestro CLI not found (need >= 2.7.0; brew install mobile-dev-inc/tap/maestro)" >&2
  exit 2
fi
MAESTRO_VERSION="$(maestro --version 2>/dev/null | tail -n 1)"
MAESTRO_VERSION="${MAESTRO_VERSION#v}"
MAESTRO_VERSION="${MAESTRO_VERSION%%-*}"
IFS=. read -r MAESTRO_MAJOR MAESTRO_MINOR MAESTRO_PATCH <<< "$MAESTRO_VERSION"
if [[ ! "$MAESTRO_MAJOR" =~ ^[0-9]+$ ||
      ! "$MAESTRO_MINOR" =~ ^[0-9]+$ ||
      ! "$MAESTRO_PATCH" =~ ^[0-9]+$ ]] ||
   (( MAESTRO_MAJOR < 2 ||
      (MAESTRO_MAJOR == 2 && MAESTRO_MINOR < 7) )); then
  echo "run-suite.sh: Maestro CLI 2.7.0 or newer is required (found '$MAESTRO_VERSION')" >&2
  exit 2
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "run-suite.sh: jq not found" >&2
  exit 2
fi
if ! command -v xcrun >/dev/null 2>&1; then
  echo "run-suite.sh: xcrun not found (Xcode command-line tools are required)" >&2
  exit 2
fi
if [[ ! -e "$TARGET" ]]; then
  echo "run-suite.sh: flow target '$TARGET' does not exist" >&2
  exit 2
fi

E2E_UDID="${E2E_UDID:-$(xcrun simctl list devices --json |
  jq -r --arg n "$SIM_NAME" '.devices[][] | select(.name == $n) | .udid' | head -n 1)}"
if [[ -z "$E2E_UDID" ]]; then
  echo "run-suite.sh: pinned simulator '$SIM_NAME' not found — create it per HARNESS.md §6.1" >&2
  exit 2
fi

SIM_STATE="$(xcrun simctl list devices --json |
  jq -r --arg u "$E2E_UDID" '.devices[][] | select(.udid == $u) | .state')"
if [[ "$SIM_STATE" != "Booted" ]]; then
  # Deliberately NOT auto-booting: session start (HARNESS.md §6.1) applies the
  # determinism pins after boot; booting here would silently skip them.
  echo "run-suite.sh: '$SIM_NAME' is $SIM_STATE, not Booted — run the session-start checklist (HARNESS.md §6.1) first" >&2
  exit 2
fi

if [[ -n "$APP_BINARY" ]]; then
  if [[ ! -d "$APP_BINARY" ]]; then
    echo "run-suite.sh: APP_BINARY '$APP_BINARY' does not exist" >&2
    exit 2
  fi
  xcrun simctl install "$E2E_UDID" "$APP_BINARY"
fi
if ! xcrun simctl get_app_container "$E2E_UDID" "$APP_BUNDLE_ID" app >/dev/null 2>&1; then
  echo "run-suite.sh: '$APP_BUNDLE_ID' is not installed — set APP_BINARY to a release-style e2e simulator build" >&2
  exit 2
fi

# ---- run --------------------------------------------------------------------
mkdir -p "$OUT_DIR"
rm -rf "$OUT_DIR/artifacts" "$OUT_DIR/debug"
rm -f "$OUT_DIR/report.xml"

export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-120000}"

MAESTRO_ARGS=(
  test "$TARGET"
  --format junit
  --output "$OUT_DIR/report.xml"
  --test-output-dir "$OUT_DIR/artifacts"
  --debug-output "$OUT_DIR/debug"
  --flatten-debug-output
  --udid "$E2E_UDID"
  --no-reinstall-driver
)
if [[ -n "$INCLUDE_TAGS" ]]; then
  MAESTRO_ARGS+=(--include-tags="$INCLUDE_TAGS")
fi
if [[ -n "$EXCLUDE_TAGS" ]]; then
  MAESTRO_ARGS+=(--exclude-tags="$EXCLUDE_TAGS")
fi

set +e
maestro "${MAESTRO_ARGS[@]}"
STATUS=$?
set -e

# ---- verdict ----------------------------------------------------------------
if [[ $STATUS -eq 0 ]]; then
  echo "run-suite: GREEN (report: $OUT_DIR/report.xml)"
  exit 0
fi

echo "run-suite: RED — failing testcases from $OUT_DIR/report.xml:" >&2
if [[ -f "$OUT_DIR/report.xml" ]]; then
  # Cheap JUnit skim; the loop must still read the <failure> text + the
  # failing flow's artifact bundle before touching code (HARNESS.md §2.1).
  grep -B 1 '<failure' "$OUT_DIR/report.xml" >&2 || true
fi
echo "run-suite: artifacts in $OUT_DIR/artifacts/ (screenshot + view hierarchy per failing flow)" >&2
exit 1
