#!/bin/bash
# Install the standalone (embedded-bundle) Trace Lab research build over the
# current Trace Lab on iPhone Il and prove it boots its real research screen
# with no Metro server, no dev-client URL, no LAN service and no production
# ExcerLock mutation. This is the executable form of the regression that made
# the previous research build unusable: a Trace Lab that needs a running Mac.
#
# Usage: app-next/scripts/prove-linked-recorder-on-phone.sh [path/to/ExcerLock.app]
#   IL_UDID  device identifier (default: the paired lab phone Il)
# The independence gate below is unconditional: this proof must never pass
# while Metro or port 8081 is available.
set -euo pipefail

IL="${IL_UDID:-F4E839C0-3F05-5BF8-BA31-12949B2B83AB}"
LAB="com.johansardar.excerlock.lab.linkedtrace"
PROD="com.johansardar.excerlock"
WALK="com.johansardar.excerlock.lab.walkingrecorder"
PRODUCTION_RECORD="production-install-record.cjs"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP="${1:-$APP_DIR/.scratch/standalone-research/DerivedData/Build/Products/Release-iphoneos/ExcerLock.app}"
OUT="${PROVE_OUT:-$APP_DIR/.scratch/prove-phone}"
OCR="/usr/bin/python3"

mkdir -p "$OUT"
step() { printf '\n== %s\n' "$*"; }

[[ -d "$APP" ]] || { echo "missing artifact: $APP" >&2; exit 2; }
[[ "$(uname)" == "Darwin" ]] || { echo "device proof runs on macOS only" >&2; exit 2; }

step "0. artifact under test"
node "$SCRIPT_DIR/verify-standalone-research.cjs" "$APP" | tee "$OUT/artifact-verify.log"
echo "cdhash: $(codesign -dvvv "$APP" 2>&1 | sed -n 's/^CDHash=//p')"
echo "sha256: $(shasum -a 256 "$APP/ExcerLock" | awk '{print $1}')"

step "1. the Mac must not be serving this build"
if lsof -nP -iTCP:8081 -sTCP:LISTEN > "$OUT/port8081-before.log" 2>&1; then
  cat "$OUT/port8081-before.log"
  echo "VERIFY FAIL: something is listening on port 8081; stop Metro before the independence proof" >&2
  exit 2
fi
if pgrep -fl "expo start" > "$OUT/metro-before.log" 2>&1; then
  cat "$OUT/metro-before.log"
  echo "VERIFY FAIL: a Metro process is running; the standalone build must not need it" >&2
  exit 2
fi
echo "no Metro listener on 8081 and no expo start process"

step "2. device state + production baseline (before)"
xcrun devicectl list devices > "$OUT/device-list-before.log" 2>&1
grep -E "^ *Il " "$OUT/device-list-before.log" | tail -1 || true
xcrun devicectl device info apps --device "$IL" > "$OUT/apps-before.log" 2>&1
grep -E "$PROD|$LAB|$WALK" "$OUT/apps-before.log" || true
# Exact identity only: the research apps share production's bundle-id prefix, so
# the before/after comparison must never treat a lab install as production.
node "$SCRIPT_DIR/$PRODUCTION_RECORD" "$OUT/apps-before.log" > "$OUT/production-before.log"
cat "$OUT/production-before.log"
if [[ ! -s "$OUT/production-before.log" ]]; then
  echo "VERIFY FAIL: no production ExcerLock (${PROD}) install record in the before list; unlock Il, confirm production ExcerLock is installed, and rerun so the comparison has a baseline" >&2
  exit 2
fi
xcrun devicectl device info processes --device "$IL" > "$OUT/processes-before.log" 2>&1
grep -E "ExcerLock|PhoneWalkingRecorder" "$OUT/processes-before.log" || true

step "3. install the standalone Trace Lab over the current one"
xcrun devicectl device install app --device "$IL" "$APP" 2>&1 | tee "$OUT/install.log" | tail -3

step "4. launch with no payload URL, no dev-client URL and no network service"
launch_started="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
xcrun devicectl device process launch --device "$IL" --terminate-existing "$LAB" 2>&1 | tee "$OUT/launch.log"
sleep 8

step "5. screenshot + OCR of the real research screen"
for i in 1 2 3; do
  pymobiledevice3 developer dvt screenshot "$OUT/launch-$i.png" >/dev/null 2>&1 || true
  sleep 2
done
ls -la "$OUT"/launch-*.png 2>/dev/null || true
"$OCR" "$SCRIPT_DIR/device-ocr.py" "$OUT"/launch-*.png 2>/dev/null | tee "$OUT/launch-ocr.txt" || true

step "6. the launched binary runs the research screen, not a launch prompt"
if grep -q "How the test works" "$OUT/launch-ocr.txt" 2>/dev/null; then
  echo "VERIFY PASS: Trace Lab rendered its guided research screen on the phone"
elif grep -q "Metro\|dev server\|Development build\|expo-development-client" "$OUT/launch-ocr.txt" 2>/dev/null; then
  echo "VERIFY FAIL: Trace Lab asked for a development server" >&2
  exit 1
else
  echo "VERIFY WARN: OCR did not see the research screen; inspect $OUT/launch-*.png by hand" >&2
fi

step "7. production ExcerLock was not replaced"
xcrun devicectl device info apps --device "$IL" > "$OUT/apps-after.log" 2>&1
node "$SCRIPT_DIR/$PRODUCTION_RECORD" "$OUT/apps-after.log" > "$OUT/production-after.log"
if diff -u "$OUT/production-before.log" "$OUT/production-after.log" > "$OUT/production-diff.log"; then
  echo "VERIFY PASS: production ExcerLock install record unchanged"
else
  echo "VERIFY FAIL: production ExcerLock install record changed" >&2
  cat "$OUT/production-diff.log" >&2
  exit 1
fi
grep -E "$LAB|$WALK" "$OUT/apps-after.log" || true

step "8. no dev-server traffic during and after the launch"
lsof -nP -iTCP:8081 > "$OUT/port8081-after.log" 2>&1 || true
cat "$OUT/port8081-after.log"
echo "launch window: $launch_started .. $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "evidence in $OUT"
