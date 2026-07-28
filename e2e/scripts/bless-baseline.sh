#!/usr/bin/env bash
# ============================================================================
# bless-baseline.sh — the ONLY sanctioned way a baseline PNG changes
# (HARNESS.md §3). A baseline is a design sign-off, not a test artifact;
# this script refuses to run without an explicit approval flag, and agents
# NEVER bless to turn a red gate green.
#
# Usage:
#   bless-baseline.sh --list               # captures awaiting first sign-off /
#                                          # baselines with pending diffs
#   bless-baseline.sh --first <screen>     # FIRST capture: Johan approved the
#                                          # PNG itself against design/STYLE.md
#   bless-baseline.sh --reviewed <screen>  # UPDATE: Johan reviewed the diff
#                                          # mask out/diffs/<screen>.png
#
# --reviewed also stages the reviewed diff mask at
# baselines/.review/<screen>.diff.png — commit it WITH the baseline so the
# change is reviewed as a diff in the PR, never silently.
#
# Exit codes: 0 blessed (or list printed) · 1 refused / preconditions unmet ·
#             2 environment error
#
# TEMPLATE — the app does not exist yet.
# ============================================================================
set -euo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINES_DIR="$E2E_DIR/baselines"
REVIEW_DIR="$BASELINES_DIR/.review"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-$E2E_DIR/out/artifacts}"
DIFFS_DIR="$E2E_DIR/out/diffs"

usage() {
  grep '^# ' "${BASH_SOURCE[0]}" | head -n 20 >&2
  exit 1
}

newest_capture() {
  find "$ARTIFACTS_DIR" -type f -name "$1.png" -print0 2>/dev/null |
    xargs -0 ls -t 2>/dev/null | head -n 1 || true
}

MODE="${1:-}"
case "$MODE" in
  --list)
    echo "== captures with no baseline (need --first after Johan approves the PNG) =="
    if [[ -d "$ARTIFACTS_DIR" ]]; then
      find "$ARTIFACTS_DIR" -type f -name '*.png' -exec basename {} .png \; 2>/dev/null |
        grep -E '^[a-z0-9][a-z0-9-]*$' | grep -v '^screenshot' | sort -u |
        while IFS= read -r s; do
          [[ -f "$BASELINES_DIR/$s.png" ]] || echo "  $s  ($(newest_capture "$s"))"
        done
    fi
    echo "== pending diff masks (need --reviewed after Johan reviews the diff) =="
    if [[ -d "$DIFFS_DIR" ]]; then
      find "$DIFFS_DIR" -type f -name '*.png' -exec basename {} .png \; 2>/dev/null |
        sort | sed 's/^/  /'
    fi
    exit 0
    ;;
  --first | --reviewed)
    SCREEN="${2:-}"
    if [[ -z "$SCREEN" ]]; then
      echo "bless-baseline.sh: missing <screen> argument" >&2
      usage
    fi
    ;;
  *)
    echo "bless-baseline.sh: REFUSED — an explicit approval flag is required." >&2
    echo "Baselines change only via --first (Johan approved the capture) or" >&2
    echo "--reviewed (Johan reviewed the diff mask). See HARNESS.md §3." >&2
    usage
    ;;
esac

CAPTURE="$(newest_capture "$SCREEN")"
if [[ -z "$CAPTURE" ]]; then
  echo "bless-baseline.sh: no capture named '$SCREEN.png' under $ARTIFACTS_DIR — run the flow first" >&2
  exit 1
fi
BASELINE="$BASELINES_DIR/$SCREEN.png"
mkdir -p "$BASELINES_DIR"

if [[ "$MODE" == "--first" ]]; then
  if [[ -f "$BASELINE" ]]; then
    echo "bless-baseline.sh: '$SCREEN' already has a baseline — updates require --reviewed with a diff mask" >&2
    exit 1
  fi
  cp "$CAPTURE" "$BASELINE"
  echo "blessed (first): $BASELINE"
  echo "  from capture: $CAPTURE"
  echo "  commit it with a message naming Johan's sign-off of this screen."
  exit 0
fi

# --reviewed
if [[ ! -f "$BASELINE" ]]; then
  echo "bless-baseline.sh: '$SCREEN' has no baseline yet — first captures go through --first" >&2
  exit 1
fi
DIFF_MASK="$DIFFS_DIR/$SCREEN.png"
if [[ ! -f "$DIFF_MASK" ]]; then
  # No mask means the sweep never flagged this screen — nothing reviewable
  # exists, so there is nothing legitimate to bless.
  echo "bless-baseline.sh: no diff mask at $DIFF_MASK — run visual-sweep.sh first;" >&2
  echo "a --reviewed bless without a reviewed diff is not a thing (HARNESS.md §3)" >&2
  exit 1
fi

mkdir -p "$REVIEW_DIR"
cp "$DIFF_MASK" "$REVIEW_DIR/$SCREEN.diff.png"
cp "$CAPTURE" "$BASELINE"
echo "blessed (reviewed): $BASELINE"
echo "  from capture:  $CAPTURE"
echo "  reviewed diff staged at: $REVIEW_DIR/$SCREEN.diff.png"
echo "  commit BOTH files together; the commit message names the deliberate"
echo "  visual change and Johan's review."
exit 0
