#!/bin/bash
# Bounded on-device observation for the standalone Trace Lab phone proof.
#
# observe_launch_evidence <out-dir> <script-dir> <ocr-python>
#   Captures a device screenshot, OCRs it with device-ocr.py, and asks
#   verify-launch-evidence.cjs whether a real Trace Lab research-screen phase
#   (ready, running, finished-awaiting-save, expired, or saved list) was
#   observed.
#   Retries up to OBSERVE_ATTEMPTS times (default 8) with OBSERVE_INTERVAL
#   seconds (default 2) between attempts; the first attempt starts immediately,
#   with no blind pre-wait. Returns 0 as soon as positive evidence is observed,
#   returns 1 immediately when the terminal dev-client prompt is observed, and
#   otherwise returns 1 after the bound. Every attempt keeps its screenshot,
#   OCR transcript and evidence log in <out-dir> as diagnostics.
#
# Sourced by scripts/prove-linked-recorder-on-phone.sh; exercised hermetically
# by scripts/observe-launch-evidence.test.cjs with a stubbed screenshot command
# and OCR binary.
observe_launch_evidence() {
  local out="$1" script_dir="$2" ocr="$3"
  local attempts="${OBSERVE_ATTEMPTS:-8}"
  local interval="${OBSERVE_INTERVAL:-2}"
  local observed=0 screenshot_failures=0 ocr_failures=0
  local last_reason="no observation attempt ran" attempt=0
  # Drop an earlier run's evidence so a stale screenshot or transcript can never
  # be mistaken for this launch's observation.
  rm -f "$out"/launch-*.png "$out"/launch-ocr-*.txt "$out"/launch-ocr-*.err \
    "$out"/launch-evidence-*.log "$out"/launch-screenshot-*.log
  for attempt in $(seq 1 "$attempts"); do
    local shot="$out/launch-$attempt.png"
    local shot_log="$out/launch-screenshot-$attempt.log"
    local ocr_txt="$out/launch-ocr-$attempt.txt"
    local ocr_err="$out/launch-ocr-$attempt.err"
    local evidence_log="$out/launch-evidence-$attempt.log"
    local gate_status=0
    if ! pymobiledevice3 developer dvt screenshot "$shot" > "$shot_log" 2>&1; then
      screenshot_failures=$((screenshot_failures + 1))
      last_reason="screenshot attempt $attempt failed; see $shot_log"
    elif ! "$ocr" "$script_dir/device-ocr.py" "$shot" > "$ocr_txt" 2> "$ocr_err"; then
      ocr_failures=$((ocr_failures + 1))
      last_reason="device OCR attempt $attempt failed; see $ocr_err"
    else
      node "$script_dir/verify-launch-evidence.cjs" "$ocr_txt" > "$evidence_log" 2>&1 || gate_status=$?
      if [[ "$gate_status" -eq 0 ]]; then
        observed=1
        cat "$evidence_log"
        break
      fi
      last_reason="$(tail -n 1 "$evidence_log" 2>/dev/null || true)"
      [[ -n "$last_reason" ]] || last_reason="attempt $attempt produced no launch evidence"
      if [[ "$gate_status" -eq 3 ]]; then
        cat "$evidence_log" >&2
        echo "VERIFY FAIL: the installed binary asked for a development server; this artifact is not standalone" >&2
        echo "diagnostics: $evidence_log and $shot" >&2
        return 1
      fi
    fi
    if [[ "$attempt" -lt "$attempts" ]]; then
      sleep "$interval"
    fi
  done
  if [[ "$observed" -eq 1 ]]; then
    echo "VERIFY PASS: Trace Lab rendered its guided research screen on attempt $attempt of $attempts"
    return 0
  fi
  echo "VERIFY FAIL: no positive research-screen evidence in $attempts bounded attempts (screenshots failed: $screenshot_failures, OCR failed: $ocr_failures)" >&2
  echo "last observation: ${last_reason}" >&2
  echo "diagnostics: $out/launch-*.png, $out/launch-ocr-*.txt and $out/launch-evidence-*.log" >&2
  return 1
}
