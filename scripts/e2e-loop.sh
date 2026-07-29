#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ID="${APP_ID:-com.johansardar.excerlock}"
SIMULATOR_NAME="${SIMULATOR_NAME:-ExcerLock-E2E}"
METRO_PORT="${METRO_PORT:-8081}"
ARTIFACTS_DIR="$ROOT_DIR/.maestro/artifacts"

fail() {
  echo "e2e-loop: $*" >&2
  exit 2
}

find_simulator_udid() {
  xcrun simctl list devices available |
    awk -F '[()]' -v name="$SIMULATOR_NAME" '
      index($0, "    " name " (") == 1 {
        print $2
        exit
      }
    '
}

app_is_installed() {
  xcrun simctl get_app_container "$E2E_UDID" "$APP_ID" app >/dev/null 2>&1
}

build_dev_client() {
  echo "e2e-loop: building and installing the Expo development client"
  (
    cd "$ROOT_DIR"
    npm run ios --workspace app -- --device "$E2E_UDID" --no-bundler
  )
}

command -v xcrun >/dev/null 2>&1 || fail "xcrun not found; install Xcode command-line tools"
command -v maestro >/dev/null 2>&1 || fail "maestro not found; install the local Maestro CLI"
command -v curl >/dev/null 2>&1 || fail "curl not found"

E2E_UDID="${E2E_UDID:-$(find_simulator_udid)}"
[[ -n "$E2E_UDID" ]] ||
  fail "simulator '$SIMULATOR_NAME' not found; set SIMULATOR_NAME or E2E_UDID"

SIMULATOR_STATE="$(
  xcrun simctl list devices |
    awk -F '[()]' -v udid="$E2E_UDID" '$2 == udid { print $4; exit }'
)"
if [[ "$SIMULATOR_STATE" != "Booted" ]]; then
  echo "e2e-loop: booting '$SIMULATOR_NAME' ($E2E_UDID)"
  xcrun simctl boot "$E2E_UDID" || fail "could not boot simulator $E2E_UDID"
fi
xcrun simctl bootstatus "$E2E_UDID" -b || fail "simulator did not finish booting"
open -a Simulator --args -CurrentDeviceUDID "$E2E_UDID" ||
  fail "could not open Simulator for $E2E_UDID"

if ! curl --fail --silent "http://127.0.0.1:$METRO_PORT/status" |
  grep -q "packager-status:running"; then
  fail "Metro is not running on port $METRO_PORT; run 'npm run start --workspace app'"
fi

if [[ "${BUILD_DEV_CLIENT:-0}" == "1" ]] || ! app_is_installed; then
  build_dev_client || fail "Expo development-client build failed"
fi
app_is_installed || fail "bundle $APP_ID is not installed on simulator $E2E_UDID"

mkdir -p "$ARTIFACTS_DIR"
ATTEMPT=1

while true; do
  RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-attempt-$ATTEMPT"
  ATTEMPT_RELATIVE_DIR="artifacts/$RUN_ID"
  ATTEMPT_DIR="$ROOT_DIR/.maestro/$ATTEMPT_RELATIVE_DIR"
  mkdir -p "$ATTEMPT_DIR"

  echo "e2e-loop: attempt $ATTEMPT"
  set +e
  (
    cd "$ROOT_DIR"
    maestro --device "$E2E_UDID" test .maestro/ \
      --test-output-dir="$ATTEMPT_RELATIVE_DIR"
  ) 2>&1 | tee "$ATTEMPT_DIR/maestro-cli.log"
  STATUS="${PIPESTATUS[0]}"
  set -e

  if [[ "$STATUS" -eq 0 ]]; then
    echo "e2e-loop: GREEN; artifacts: $ATTEMPT_DIR"
    exit 0
  fi

  echo "e2e-loop: RED (exit $STATUS); inspect $ATTEMPT_DIR" >&2
  if [[ ! -t 0 ]]; then
    exit "$STATUS"
  fi

  read -r -p "Fix the failure, then press Enter to rerun (q to quit): " REPLY
  [[ "$REPLY" != "q" && "$REPLY" != "Q" ]] || exit "$STATUS"
  ATTEMPT=$((ATTEMPT + 1))
done
