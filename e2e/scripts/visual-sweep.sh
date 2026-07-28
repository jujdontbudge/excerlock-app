#!/usr/bin/env bash
# ============================================================================
# visual-sweep.sh — layer-2 zero-tolerance visual gate (HARNESS.md §4.2).
# Compares every blessed baseline against the newest matching capture in the
# artifacts tree with odiff (--fail-on-layout -t 0 --aa), writes diff masks to
# out/diffs/, and emits machine-readable TSV to stdout + out/visual-results.tsv.
#
# TSV columns: status  screen  odiff_exit  baseline  capture  diff
# Statuses:    MATCH | LAYOUT_DIFF | PIXEL_DIFF | MISSING | NO_BASELINE | ERROR
#
# Usage:
#   visual-sweep.sh                    # sweep after a --with-visual suite run
#   visual-sweep.sh --allow-unblessed  # early bring-up only: captures without
#                                      # a baseline don't fail the sweep
#
# Exit codes:
#   0  every baseline matched (and, unless --allow-unblessed, every capture is blessed)
#   1  >=1 diff / missing capture / unblessed capture — masks in out/diffs/
#   2  environment not ready (odiff missing, no artifacts dir)
#
# TEMPLATE — the app does not exist yet.
# ============================================================================
set -euo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASELINES_DIR="$E2E_DIR/baselines"
ARTIFACTS_DIR="${ARTIFACTS_DIR:-$E2E_DIR/out/artifacts}"
DIFFS_DIR="$E2E_DIR/out/diffs"
RESULTS_TSV="$E2E_DIR/out/visual-results.tsv"
ODIFF_BIN="${ODIFF_BIN:-odiff}" # npm i -g odiff-bin, or point ODIFF_BIN at it

ALLOW_UNBLESSED=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --allow-unblessed)
      ALLOW_UNBLESSED=1
      shift
      ;;
    *)
      echo "visual-sweep.sh: unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

if ! command -v "$ODIFF_BIN" >/dev/null 2>&1; then
  echo "visual-sweep.sh: odiff not found (npm install -g odiff-bin, or set ODIFF_BIN)" >&2
  exit 2
fi
if [[ ! -d "$ARTIFACTS_DIR" ]]; then
  echo "visual-sweep.sh: no artifacts at $ARTIFACTS_DIR — run run-suite.sh --with-visual first" >&2
  exit 2
fi

rm -rf "$DIFFS_DIR"
mkdir -p "$DIFFS_DIR" "$(dirname "$RESULTS_TSV")"

# newest_capture <screen> — newest PNG with that name anywhere under artifacts
newest_capture() {
  find "$ARTIFACTS_DIR" -type f -name "$1.png" -print0 2>/dev/null |
    xargs -0 ls -t 2>/dev/null | head -n 1 || true
}

FAILS=0
emit() { # status screen odiff_exit baseline capture diff
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" "$5" "$6" | tee -a "$RESULTS_TSV"
}

printf 'status\tscreen\todiff_exit\tbaseline\tcapture\tdiff\n' >"$RESULTS_TSV"

# ---- pass 1: every baseline must have a matching, identical capture --------
shopt -s nullglob
BASELINES=("$BASELINES_DIR"/*.png)
for baseline in "${BASELINES[@]}"; do
  screen="$(basename "$baseline" .png)"
  capture="$(newest_capture "$screen")"
  if [[ -z "$capture" ]]; then
    emit MISSING "$screen" - "$baseline" - -
    FAILS=$((FAILS + 1))
    continue
  fi

  diff_png="$DIFFS_DIR/$screen.png"
  set +e
  "$ODIFF_BIN" --fail-on-layout -t 0 --aa "$baseline" "$capture" "$diff_png" >/dev/null
  rc=$?
  set -e
  case "$rc" in
    0)
      emit MATCH "$screen" 0 "$baseline" "$capture" -
      rm -f "$diff_png"
      ;;
    21)
      emit LAYOUT_DIFF "$screen" 21 "$baseline" "$capture" "$diff_png"
      FAILS=$((FAILS + 1))
      ;;
    22)
      emit PIXEL_DIFF "$screen" 22 "$baseline" "$capture" "$diff_png"
      FAILS=$((FAILS + 1))
      ;;
    *)
      emit ERROR "$screen" "$rc" "$baseline" "$capture" -
      FAILS=$((FAILS + 1))
      ;;
  esac
done

# ---- pass 2: every capture must be blessed (an unsigned screen isn't done) --
# Deliberate captures are kebab-case screen names (takeScreenshot: <screen>);
# the filter drops Maestro's auto-generated per-step screenshots.
while IFS= read -r screen; do
  if [[ ! -f "$BASELINES_DIR/$screen.png" ]]; then
    emit NO_BASELINE "$screen" - - "$(newest_capture "$screen")" -
    if [[ "$ALLOW_UNBLESSED" -eq 0 ]]; then
      FAILS=$((FAILS + 1))
    fi
  fi
done < <(find "$ARTIFACTS_DIR" -type f -name '*.png' -exec basename {} .png \; 2>/dev/null |
  grep -E '^[a-z0-9][a-z0-9-]*$' | grep -v '^screenshot' | sort -u || true)

if [[ "$FAILS" -eq 0 ]]; then
  echo "visual-sweep: GREEN (${#BASELINES[@]} baselines, results: $RESULTS_TSV)"
  exit 0
fi
echo "visual-sweep: RED — $FAILS failure(s); diff masks in $DIFFS_DIR, results: $RESULTS_TSV" >&2
exit 1
