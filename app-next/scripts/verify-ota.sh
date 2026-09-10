#!/bin/bash
# T03 verify-ota.sh — §5 steps 2-3 (used by T16).
# Audits the paginated numerically-newest READY_FOR_SALE IOS version (never local
# app.json), resolves its attached build, reads that build's embedded runtime
# from its exported Expo.plist/IPA, then proves device activation from an
# actual expo-v11.db (intended update id with successful_launch_count > 0).
# Manifest/server metadata is NEVER device proof. Missing artifacts are a
# reported runtime limit (non-zero exit), never a skipped test marked passed.
set -euo pipefail

ASC_APP_ID=""
EXPECTED_UPDATE_ID=""
EXPECTED_RUNTIME=""
DB_PATH=""
EXPO_PLIST=""
IPA_PATH=""
DEVICE_UDID=""
OUTPUT="text"

usage() {
  cat <<'USAGE'
Usage: verify-ota.sh --asc-app-id <id> --expected-update-id <uuid> --expected-runtime <string> --db-path /path/to/expo-v11.db [--expo-plist /path/to/Expo.plist | --ipa /path/to/app.ipa] [--device-udid <udid>] [--output text|json]

  --asc-app-id         App Store Connect app ID (e.g., 6787265352). Required. No default guessed.
  --expected-update-id Intended EAS update UUID (canonical lowercase). Required.
  --expected-runtime   Intended runtimeVersion string (e.g., "1"). Required.
  --db-path            Exported device expo-v11.db from Library/Application Support/.expo-internal/expo-v11.db
                       after delete-install-launch-twice on a physical phone (App Store AND TestFlight).
                       Required. No path guessed.
  --expo-plist         Exported Expo.plist from the live build's IPA payload (contains EXUpdatesRuntimeVersion).
  --ipa                Exported .ipa for the live build (alternative to --expo-plist; script extracts Expo.plist).
  --device-udid        Physical device UDID for log context only. Does not replace --db-path proof.
  --output             text (default) or json.
  --help               Print this help.

Device proof requires the actual sqlite file. Server/manifest metadata alone always fails.
USAGE
}

fail() { echo "FAIL: $1" >&2; exit 2; }
runtime_limit() { echo "RUNTIME LIMIT: $1" >&2; exit 2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --asc-app-id) ASC_APP_ID="${2:-}"; shift 2 ;;
    --expected-update-id) EXPECTED_UPDATE_ID="${2:-}"; shift 2 ;;
    --expected-runtime) EXPECTED_RUNTIME="${2:-}"; shift 2 ;;
    --db-path) DB_PATH="${2:-}"; shift 2 ;;
    --expo-plist) EXPO_PLIST="${2:-}"; shift 2 ;;
    --ipa) IPA_PATH="${2:-}"; shift 2 ;;
    --device-udid) DEVICE_UDID="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    --dry-run) fail "--dry-run cannot prove device activation. Provide --db-path from a physical phone; no deceptive dry-run success." ;;
    --help|-h) usage; exit 0 ;;
    *) fail "unknown argument: $1" ;;
  esac
done

[[ -n "$ASC_APP_ID" ]] || fail "missing --asc-app-id (e.g., 6787265352). No default guessed."
[[ -n "$EXPECTED_UPDATE_ID" ]] || fail "missing --expected-update-id <uuid>. Device proof requires the intended update id."
[[ -n "$EXPECTED_RUNTIME" ]] || fail "missing --expected-runtime <string>. Publish only to the runtime embedded in the live build."
[[ -n "$DB_PATH" ]] || runtime_limit "missing --db-path /path/to/expo-v11.db. Physical device artifact not provided; cannot prove activation. On a physical phone: delete the app, install from the public App Store (and separately TestFlight), launch twice, export Library/Application Support/.expo-internal/expo-v11.db, then re-run with --db-path."
[[ "$OUTPUT" == "text" || "$OUTPUT" == "json" ]] || fail "--output must be text or json."

# UUID format (accept upper/lower, normalize later).
if ! [[ "$EXPECTED_UPDATE_ID" =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
  fail "--expected-update-id must be a canonical UUID (got: $EXPECTED_UPDATE_ID)."
fi
EXPECTED_HEX=$(echo "$EXPECTED_UPDATE_ID" | tr '[:upper:]' '[:lower:]' | tr -d '-')

command -v asc >/dev/null 2>&1 || fail "asc CLI not found in PATH."
command -v sqlite3 >/dev/null 2>&1 || fail "sqlite3 not found in PATH."
command -v jq >/dev/null 2>&1 || fail "jq not found in PATH."
command -v python3 >/dev/null 2>&1 || fail "python3 not found in PATH."

[[ -f "$DB_PATH" ]] || runtime_limit "db artifact not found at --db-path=$DB_PATH. Export the actual expo-v11.db from a physical phone and re-run; no path guessed."
if [[ -n "$EXPO_PLIST" && -n "$IPA_PATH" ]]; then
  fail "pass only one of --expo-plist or --ipa."
fi
if [[ -n "$EXPO_PLIST" && ! -f "$EXPO_PLIST" ]]; then
  fail "--expo-plist not found: $EXPO_PLIST."
fi
if [[ -n "$IPA_PATH" && ! -f "$IPA_PATH" ]]; then
  fail "--ipa not found: $IPA_PATH."
fi

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# --- Step 2a: paginated numerically-newest READY_FOR_SALE IOS version (never local app.json) ---
if ! asc versions list --app "$ASC_APP_ID" --state READY_FOR_SALE --paginate --output json > "$TMPDIR/versions.json" 2>"$TMPDIR/asc.err"; then
  cat "$TMPDIR/asc.err" >&2
  fail "asc versions list failed for app $ASC_APP_ID."
fi

python3 - "$TMPDIR/versions.json" "$TMPDIR/newest.json" <<'PY'
import json, sys
versions_path, out_path = sys.argv[1], sys.argv[2]
with open(versions_path) as f:
    payload = json.load(f)
rows = []
for item in payload.get("data", []):
    attrs = item.get("attributes", {}) or {}
    if (attrs.get("platform") or "IOS") != "IOS":
        continue
    state = attrs.get("appStoreState") or attrs.get("appVersionState") or ""
    if state != "READY_FOR_SALE":
        continue
    vs = attrs.get("versionString") or ""
    if not vs:
        continue
    try:
        key = tuple(int(p) for p in vs.split("."))
    except ValueError:
        continue
    rows.append((key, vs, item.get("id")))
if not rows:
    json.dump({"found": False}, open(out_path, "w"))
    sys.exit(0)
rows.sort(key=lambda r: r[0])
key, vs, vid = rows[-1]
json.dump({"found": True, "version": vs, "versionId": vid, "count": len(rows)}, open(out_path, "w"))
PY

if ! jq -e '.found == true' "$TMPDIR/newest.json" >/dev/null 2>&1; then
  fail "no READY_FOR_SALE IOS version found for app $ASC_APP_ID (paginated query returned none). Cannot determine the live runtime; publish nothing."
fi
LIVE_VERSION=$(jq -r '.version' "$TMPDIR/newest.json")
LIVE_VERSION_ID=$(jq -r '.versionId' "$TMPDIR/newest.json")
LIVE_COUNT=$(jq -r '.count' "$TMPDIR/newest.json")

# --- Step 2b: resolve attached build for the live version ---
if ! asc versions view --version-id "$LIVE_VERSION_ID" --include build --output json > "$TMPDIR/version-detail.json" 2>"$TMPDIR/view.err"; then
  cat "$TMPDIR/view.err" >&2
  fail "asc versions view failed for version id $LIVE_VERSION_ID."
fi
BUILD_ID=$(jq -r '.data.relationships.build.data.id // empty' "$TMPDIR/version-detail.json")
if [[ -z "$BUILD_ID" ]]; then
  fail "live version $LIVE_VERSION ($LIVE_VERSION_ID) has no attached build. Resolve the build in App Store Connect before publishing OTA."
fi
BUILD_VERSION=$(jq -r '(.included // [] | map(select(.type=="builds")) | .[0].attributes.version // empty)' "$TMPDIR/version-detail.json")
BUILD_NUMBER=$(jq -r '(.included // [] | map(select(.type=="builds")) | .[0].attributes.buildNumber // empty)' "$TMPDIR/version-detail.json")

# --- Step 2c: read embedded runtimeVersion from the exported build artifact ---
EMBEDDED_RUNTIME=""
PLIST_TO_READ=""
if [[ -n "$IPA_PATH" ]]; then
  rm -rf "$TMPDIR/ipa"
  mkdir -p "$TMPDIR/ipa"
  if ! unzip -q "$IPA_PATH" -d "$TMPDIR/ipa" 2>"$TMPDIR/unzip.err"; then
    cat "$TMPDIR/unzip.err" >&2
    fail "failed to unzip --ipa=$IPA_PATH."
  fi
  # Find Expo.plist inside the payload (Payload/<App>.app/Expo.plist in release builds).
  PLIST_TO_READ=$(find "$TMPDIR/ipa" -name "Expo.plist" -print -quit 2>/dev/null || true)
  [[ -n "$PLIST_TO_READ" ]] || fail "no Expo.plist found inside --ipa=$IPA_PATH. Export the IPA for the live build ($LIVE_VERSION build $BUILD_ID) and re-run."
elif [[ -n "$EXPO_PLIST" ]]; then
  PLIST_TO_READ="$EXPO_PLIST"
else
  fail "cannot verify embedded runtime without --expo-plist or --ipa for the live build ($LIVE_VERSION build $BUILD_ID). Provide the exported artifact; local app.json is never used."
fi

EMBEDDED_RUNTIME=$(python3 - "$PLIST_TO_READ" <<'PY'
import plistlib, sys
path = sys.argv[1]
with open(path, "rb") as f:
    plist = plistlib.load(f)
for key in ("EXUpdatesRuntimeVersion", "runtimeVersion"):
    value = plist.get(key)
    if isinstance(value, str) and value:
        print(value)
        sys.exit(0)
sys.exit(1)
PY
) || fail "Expo.plist at $PLIST_TO_READ has no EXUpdatesRuntimeVersion. Provide the plist from the live build."

if [[ "$EMBEDDED_RUNTIME" != "$EXPECTED_RUNTIME" ]]; then
  fail "intended runtime \"$EXPECTED_RUNTIME\" differs from live build runtime \"$EMBEDDED_RUNTIME\" (version $LIVE_VERSION build $BUILD_ID). Publish only to that runtime."
fi

# --- Step 3: device activation proof from the ACTUAL expo-v11.db (never manifest metadata) ---
# Schema: updates(id BLOB 16-byte UUID, runtime_version TEXT, successful_launch_count INTEGER, ...).
# Compare via hex(id) case-insensitively against the dash-stripped expected UUID.
if ! sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name='updates';" | grep -q "^updates$"; then
  fail "db at $DB_PATH has no updates table; not an expo-v11.db export."
fi

DB_ROW=$(sqlite3 -separator $'\t' "$DB_PATH" "SELECT hex(id), successful_launch_count, failed_launch_count, runtime_version, status FROM updates;" 2>"$TMPDIR/sql.err") || {
  cat "$TMPDIR/sql.err" >&2
  fail "failed to query updates table in $DB_PATH."
}
[[ -n "$DB_ROW" ]] || fail "updates table in $DB_PATH is empty; no activation proof."

MATCH_LINE=$(echo "$DB_ROW" | awk -F$'\t' -v want="$EXPECTED_HEX" 'tolower($1)==tolower(want){print}') || true
if [[ -z "$MATCH_LINE" ]]; then
  fail "intended update id $EXPECTED_UPDATE_ID not present in device db $DB_PATH. Manifest/server metadata is not device proof."
fi
SUCCESS_COUNT=$(echo "$MATCH_LINE" | cut -f2)
FAILED_COUNT=$(echo "$MATCH_LINE" | cut -f3)
DB_RUNTIME=$(echo "$MATCH_LINE" | cut -f4)
if ! [[ "$SUCCESS_COUNT" =~ ^[0-9]+$ ]] || [[ "$SUCCESS_COUNT" -le 0 ]]; then
  fail "intended update $EXPECTED_UPDATE_ID present but successful_launch_count=${SUCCESS_COUNT:-unknown} (must be > 0). Launch the installed app twice on the physical phone, re-export expo-v11.db, and re-run."
fi

if [[ "$OUTPUT" == "json" ]]; then
  jq -n \
    --arg status "PASS" \
    --arg asc_app "$ASC_APP_ID" \
    --arg live_version "$LIVE_VERSION" \
    --arg live_version_id "$LIVE_VERSION_ID" \
    --arg build_id "$BUILD_ID" \
    --arg build_version "${BUILD_VERSION:-}" \
    --arg build_number "${BUILD_NUMBER:-}" \
    --arg embedded_runtime "$EMBEDDED_RUNTIME" \
    --arg expected_update "$EXPECTED_UPDATE_ID" \
    --arg db_path "$DB_PATH" \
    --arg db_runtime "$DB_RUNTIME" \
    --argjson success_count "$SUCCESS_COUNT" \
    --argjson failed_count "${FAILED_COUNT:-0}" \
    --arg device_udid "${DEVICE_UDID:-}" \
    '{status:$status, asc_app:$asc_app, live_version:$live_version, live_version_id:$live_version_id, build_id:$build_id, build_version:$build_version, build_number:$build_number, embedded_runtime:$embedded_runtime, expected_update:$expected_update, db_path:$db_path, db_runtime:$db_runtime, successful_launch_count:$success_count, failed_launch_count:$failed_count, device_udid:$device_udid}'
else
  cat <<OUT
PASS: OTA verified from device proof (not server metadata).
  ASC app: $ASC_APP_ID (paginated READY_FOR_SALE IOS count: $LIVE_COUNT)
  Live version: $LIVE_VERSION ($LIVE_VERSION_ID) build $BUILD_ID ${BUILD_VERSION:-}${BUILD_NUMBER:+ ($BUILD_NUMBER)}
  Embedded runtime: $EMBEDDED_RUNTIME (matches --expected-runtime)
  Intended update: $EXPECTED_UPDATE_ID present in $DB_PATH with successful_launch_count=$SUCCESS_COUNT (failed=$FAILED_COUNT, db runtime=$DB_RUNTIME)
OUT
  if [[ -n "$DEVICE_UDID" ]]; then
    echo "  Device context: $DEVICE_UDID"
  fi
fi
