#!/bin/bash
# T03 verify-ota.sh — §5 steps 2-3 (used by T16), revision: bound artifacts + dual-store proof.
# Audits the paginated numerically-newest READY_FOR_SALE IOS version (never local
# app.json), resolves its attached build, fetches that build's authoritative
# attributes.version (= CFBundleVersion build number) and the app's bundleId from
# ASC, reads the COMPLETE IPA's main Info.plist (CFBundleIdentifier /
# CFBundleShortVersionString / CFBundleVersion) plus its embedded Expo.plist
# runtime, then proves device activation from TWO caller-provided expo-v11.db
# exports (App Store AND TestFlight), each with the intended update id,
# successful_launch_count > 0, and runtime_version == expected runtime.
# Manifest/server metadata is NEVER device proof. The script never observes
# installation itself; it only audits caller-provided artifacts + explicit
# device/source evidence metadata. Missing artifacts are a reported runtime
# limit (exit 2), never a skipped test marked passed. Standalone unbound
# Expo.plist and single --db-path are rejected (unrelated builds must fail).
set -euo pipefail

ASC_APP_ID=""
EXPECTED_UPDATE_ID=""
EXPECTED_RUNTIME=""
IPA_PATH=""
APPSTORE_DB=""
TESTFLIGHT_DB=""
APPSTORE_EVIDENCE=""
TESTFLIGHT_EVIDENCE=""
APPSTORE_UDID=""
TESTFLIGHT_UDID=""
OUTPUT="text"

usage() {
  cat <<'USAGE'
Usage: verify-ota.sh --asc-app-id <id> --expected-update-id <uuid> --expected-runtime <string> --ipa /path/to/app.ipa --appstore-db /path/to/appstore-expo-v11.db --testflight-db /path/to/testflight-expo-v11.db --appstore-evidence "<device/source metadata>" --testflight-evidence "<device/source metadata>" [--appstore-udid <udid> --testflight-udid <udid>] [--output text|json]

  --asc-app-id         App Store Connect app ID (e.g., 6787265352). Required. No default guessed.
  --expected-update-id Intended EAS update UUID (canonical). Required.
  --expected-runtime   Intended runtimeVersion string (e.g., "1"). Required.
  --ipa                Complete .ipa for the live build (must contain Payload/*.app/Info.plist
                       with CFBundleIdentifier/CFBundleShortVersionString/CFBundleVersion plus
                       Payload/*.app/Expo.plist with EXUpdatesRuntimeVersion). Required.
                       Standalone --expo-plist is rejected as unbound.
  --appstore-db        Exported device expo-v11.db from the App Store install
                       (Library/Application Support/.expo-internal/expo-v11.db after
                       delete-install-launch-twice on a physical phone). Required for full PASS.
  --testflight-db      Exported device expo-v11.db from the TestFlight install (same procedure,
                       separate install). Required for full PASS. A single --db-path is rejected.
  --appstore-evidence  Explicit caller-observed device/source metadata for the App Store db
                       (e.g., "UDID=..., store=App Store, exported=..., launches=2"). Required.
                       The script audits caller-provided artifacts; it does not observe installation.
  --testflight-evidence Explicit caller-observed device/source metadata for the TestFlight db. Required.
  --appstore-udid      Physical device UDID for the App Store install (log context only). Optional
                       supplement to --appstore-evidence; does not replace --appstore-db proof.
  --testflight-udid    Physical device UDID for the TestFlight install (log context only). Optional.
  --output             text (default) or json.
  --help               Print this help.

Device proof requires BOTH actual sqlite files with the intended update id and
successful_launch_count > 0 and runtime_version == expected runtime.
Server/manifest metadata alone always fails. Missing artifacts are RUNTIME LIMIT (exit 2).
USAGE
}

fail() { echo "FAIL: $1" >&2; exit 2; }
runtime_limit() { echo "RUNTIME LIMIT: $1" >&2; exit 2; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --asc-app-id) ASC_APP_ID="${2:-}"; shift 2 ;;
    --expected-update-id) EXPECTED_UPDATE_ID="${2:-}"; shift 2 ;;
    --expected-runtime) EXPECTED_RUNTIME="${2:-}"; shift 2 ;;
    --ipa) IPA_PATH="${2:-}"; shift 2 ;;
    --appstore-db) APPSTORE_DB="${2:-}"; shift 2 ;;
    --testflight-db) TESTFLIGHT_DB="${2:-}"; shift 2 ;;
    --appstore-evidence) APPSTORE_EVIDENCE="${2:-}"; shift 2 ;;
    --testflight-evidence) TESTFLIGHT_EVIDENCE="${2:-}"; shift 2 ;;
    --appstore-udid) APPSTORE_UDID="${2:-}"; shift 2 ;;
    --testflight-udid) TESTFLIGHT_UDID="${2:-}"; shift 2 ;;
    --output) OUTPUT="${2:-}"; shift 2 ;;
    --expo-plist) fail "standalone --expo-plist is rejected as unbound (no bundle/version/build binding). Provide the complete --ipa containing Payload/*.app/Info.plist + Expo.plist for the live build." ;;
    --db-path) fail "single --db-path is rejected: full verification requires SEPARATE --appstore-db and --testflight-db (App Store AND TestFlight installs). Provide both." ;;
    --device-udid) fail "single --device-udid is rejected: provide SEPARATE --appstore-udid/--testflight-udid with --appstore-evidence/--testflight-evidence (one per store)." ;;
    --dry-run) fail "--dry-run cannot prove device activation. Provide --ipa plus --appstore-db/--testflight-db from physical phones with --appstore-evidence/--testflight-evidence; no deceptive dry-run success." ;;
    --help|-h) usage; exit 0 ;;
    *) fail "unknown argument: $1" ;;
  esac
done

[[ -n "$ASC_APP_ID" ]] || fail "missing --asc-app-id (e.g., 6787265352). No default guessed."
[[ -n "$EXPECTED_UPDATE_ID" ]] || fail "missing --expected-update-id <uuid>. Device proof requires the intended update id."
[[ -n "$EXPECTED_RUNTIME" ]] || fail "missing --expected-runtime <string>. Publish only to the runtime embedded in the live build."
[[ -n "$IPA_PATH" ]] || runtime_limit "missing --ipa /path/to/app.ipa. Complete build artifact not provided; cannot bind bundle/version/build/runtime. Export the IPA for the live build and re-run."
[[ -n "$APPSTORE_DB" ]] || runtime_limit "missing --appstore-db /path/to/appstore-expo-v11.db. App Store device artifact not provided; full verification requires SEPARATE App Store AND TestFlight dbs. On a physical phone: delete the app, install from the public App Store, launch twice, export Library/Application Support/.expo-internal/expo-v11.db, then re-run with --appstore-db (and --testflight-db)."
[[ -n "$TESTFLIGHT_DB" ]] || runtime_limit "missing --testflight-db /path/to/testflight-expo-v11.db. TestFlight device artifact not provided; full verification requires SEPARATE App Store AND TestFlight dbs. On a physical phone: delete the app, install from TestFlight, launch twice, export Library/Application Support/.expo-internal/expo-v11.db, then re-run with --testflight-db (and --appstore-db)."
[[ -n "$APPSTORE_EVIDENCE" ]] || fail "missing --appstore-evidence \"<device/source metadata>\". Explicit caller-observed App Store evidence is required; the script does not observe installation itself."
[[ -n "$TESTFLIGHT_EVIDENCE" ]] || fail "missing --testflight-evidence \"<device/source metadata>\". Explicit caller-observed TestFlight evidence is required; the script does not observe installation itself."
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
command -v unzip >/dev/null 2>&1 || fail "unzip not found in PATH."

[[ -f "$IPA_PATH" ]] || runtime_limit "ipa artifact not found at --ipa=$IPA_PATH. Export the complete IPA for the live build and re-run; no path guessed."
[[ -f "$APPSTORE_DB" ]] || runtime_limit "App Store db artifact not found at --appstore-db=$APPSTORE_DB. Export the actual expo-v11.db from the App Store install on a physical phone and re-run; no path guessed."
[[ -f "$TESTFLIGHT_DB" ]] || runtime_limit "TestFlight db artifact not found at --testflight-db=$TESTFLIGHT_DB. Export the actual expo-v11.db from the TestFlight install on a physical phone and re-run; no path guessed."

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

# --- Step 2b2: authoritative build number via builds info (attributes.version = CFBundleVersion) ---
if ! asc builds info --build-id "$BUILD_ID" --output json > "$TMPDIR/build-detail.json" 2>"$TMPDIR/build.err"; then
  cat "$TMPDIR/build.err" >&2
  fail "asc builds info failed for build $BUILD_ID."
fi
# ASC build number is attributes.version (CFBundleVersion); accept buildNumber alias for forward-compat.
BUILD_NUMBER=$(jq -r '.data.attributes.version // .data.attributes.buildNumber // empty' "$TMPDIR/build-detail.json")
if [[ -z "$BUILD_NUMBER" ]]; then
  # Fall back to the included build in the version detail (same ASC source).
  BUILD_NUMBER=$(jq -r '(.included // [] | map(select(.type=="builds")) | .[0].attributes.version // .[0].attributes.buildNumber // empty)' "$TMPDIR/version-detail.json")
fi
if [[ -z "$BUILD_NUMBER" ]]; then
  fail "attached build $BUILD_ID has no attributes.version (build number) in ASC. Resolve the build number before binding the IPA."
fi

# --- Step 2b3: authoritative bundleId via apps view ---
if ! asc apps view --id "$ASC_APP_ID" --output json > "$TMPDIR/app-detail.json" 2>"$TMPDIR/app.err"; then
  cat "$TMPDIR/app.err" >&2
  fail "asc apps view failed for app $ASC_APP_ID."
fi
ASC_BUNDLE_ID=$(jq -r '.data.attributes.bundleId // .data.attributes.bundleID // .data.attributes.bundle_id // empty' "$TMPDIR/app-detail.json")
if [[ -z "$ASC_BUNDLE_ID" ]]; then
  fail "ASC app $ASC_APP_ID has no bundleId in apps view. Resolve the bundle identifier before binding the IPA."
fi

# --- Step 2c: read COMPLETE IPA's main Info.plist + embedded Expo.plist ---
rm -rf "$TMPDIR/ipa"
mkdir -p "$TMPDIR/ipa"
if ! unzip -q "$IPA_PATH" -d "$TMPDIR/ipa" 2>"$TMPDIR/unzip.err"; then
  cat "$TMPDIR/unzip.err" >&2
  fail "failed to unzip --ipa=$IPA_PATH."
fi
# Main Info.plist: Payload/<App>.app/Info.plist (the app bundle's identifier/version/build).
INFO_PLIST=$(find "$TMPDIR/ipa/Payload" -maxdepth 2 -name "Info.plist" -print -quit 2>/dev/null || true)
if [[ -z "$INFO_PLIST" ]]; then
  # Fall back to any Info.plist under Payload for diagnostic clarity, then fail as unrelated.
  INFO_PLIST=$(find "$TMPDIR/ipa" -name "Info.plist" -print -quit 2>/dev/null || true)
fi
[[ -n "$INFO_PLIST" ]] || fail "no Info.plist found inside --ipa=$IPA_PATH. Provide the COMPLETE IPA for the live build ($LIVE_VERSION build $BUILD_ID bundle $ASC_BUNDLE_ID); unrelated or partial artifacts are rejected."
# Expo.plist must be bound inside the SAME .app (unrelated standalone plists rejected).
APP_DIR=$(dirname "$INFO_PLIST")
EXPO_PLIST="$APP_DIR/Expo.plist"
[[ -f "$EXPO_PLIST" ]] || fail "no Expo.plist bound inside the same .app as $INFO_PLIST in --ipa=$IPA_PATH. Provide the COMPLETE IPA for the live build; standalone unbound Expo.plist is rejected."

IPA_BUNDLE_ID=$(python3 - "$INFO_PLIST" <<'PY'
import plistlib, sys
with open(sys.argv[1], "rb") as f:
    plist = plistlib.load(f)
v = plist.get("CFBundleIdentifier")
print(v if isinstance(v, str) else "")
PY
)
IPA_SHORT_VERSION=$(python3 - "$INFO_PLIST" <<'PY'
import plistlib, sys
with open(sys.argv[1], "rb") as f:
    plist = plistlib.load(f)
v = plist.get("CFBundleShortVersionString")
print(v if isinstance(v, str) else "")
PY
)
IPA_BUILD_NUMBER=$(python3 - "$INFO_PLIST" <<'PY'
import plistlib, sys
with open(sys.argv[1], "rb") as f:
    plist = plistlib.load(f)
v = plist.get("CFBundleVersion")
print(v if isinstance(v, str) else "")
PY
)
[[ -n "$IPA_BUNDLE_ID" ]] || fail "IPA Info.plist at $INFO_PLIST has no CFBundleIdentifier. Provide the complete IPA for the live build."
[[ -n "$IPA_SHORT_VERSION" ]] || fail "IPA Info.plist at $INFO_PLIST has no CFBundleShortVersionString. Provide the complete IPA for the live build."
[[ -n "$IPA_BUILD_NUMBER" ]] || fail "IPA Info.plist at $INFO_PLIST has no CFBundleVersion. Provide the complete IPA for the live build."

EMBEDDED_RUNTIME=$(python3 - "$EXPO_PLIST" <<'PY'
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
) || fail "Expo.plist at $EXPO_PLIST has no EXUpdatesRuntimeVersion. Provide the plist bound inside the live build IPA."

# --- Bind IPA to ASC live attached build (unrelated builds fail) ---
if [[ "$IPA_BUNDLE_ID" != "$ASC_BUNDLE_ID" ]]; then
  fail "IPA bundle $IPA_BUNDLE_ID differs from ASC app bundle $ASC_BUNDLE_ID (live version $LIVE_VERSION build $BUILD_ID). Unrelated build rejected; provide the IPA for the live attached build."
fi
if [[ "$IPA_SHORT_VERSION" != "$LIVE_VERSION" ]]; then
  fail "IPA marketing version \"$IPA_SHORT_VERSION\" differs from ASC live version \"$LIVE_VERSION\" ($LIVE_VERSION_ID). Unrelated build rejected; provide the IPA for the live version."
fi
if [[ "$IPA_BUILD_NUMBER" != "$BUILD_NUMBER" ]]; then
  fail "IPA build number \"$IPA_BUILD_NUMBER\" differs from ASC attached build number \"$BUILD_NUMBER\" (build $BUILD_ID, attributes.version). Unrelated build rejected; provide the IPA for the live attached build."
fi
if [[ "$EMBEDDED_RUNTIME" != "$EXPECTED_RUNTIME" ]]; then
  fail "intended runtime \"$EXPECTED_RUNTIME\" differs from live build runtime \"$EMBEDDED_RUNTIME\" (version $LIVE_VERSION build $BUILD_ID). Publish only to that runtime."
fi

# --- Step 3: device activation proof from BOTH actual expo-v11.db files ---
check_one_db() {
  local label="$1"
  local db_path="$2"
  local out_prefix="$3"
  if ! sqlite3 "$db_path" "SELECT name FROM sqlite_master WHERE type='table' AND name='updates';" | grep -q "^updates$"; then
    fail "$label db at $db_path has no updates table; not an expo-v11.db export."
  fi
  local db_row
  if ! db_row=$(sqlite3 -separator $'\t' "$db_path" "SELECT hex(id), successful_launch_count, failed_launch_count, runtime_version, status FROM updates;" 2>"$TMPDIR/sql-$label.err"); then
    cat "$TMPDIR/sql-$label.err" >&2
    fail "failed to query updates table in $label db $db_path."
  fi
  [[ -n "$db_row" ]] || fail "updates table in $label db $db_path is empty; no activation proof."
  local match
  match=$(echo "$db_row" | awk -F$'\t' -v want="$EXPECTED_HEX" 'tolower($1)==tolower(want){print}') || true
  if [[ -z "$match" ]]; then
    fail "intended update id $EXPECTED_UPDATE_ID not present in $label device db $db_path. Manifest/server metadata is not device proof."
  fi
  local success failed db_runtime
  success=$(echo "$match" | cut -f2)
  failed=$(echo "$match" | cut -f3)
  db_runtime=$(echo "$match" | cut -f4)
  if ! [[ "$success" =~ ^[0-9]+$ ]] || [[ "$success" -le 0 ]]; then
    fail "intended update $EXPECTED_UPDATE_ID present in $label db $db_path but successful_launch_count=${success:-unknown} (must be > 0). Launch the installed app twice on the physical phone, re-export expo-v11.db, and re-run."
  fi
  if [[ "$db_runtime" != "$EXPECTED_RUNTIME" ]]; then
    fail "intended update $EXPECTED_UPDATE_ID in $label db has runtime_version \"$db_runtime\" differing from expected runtime \"$EXPECTED_RUNTIME\" (embedded \"$EMBEDDED_RUNTIME\"). Publish only to the runtime in the live build; wrong-DB-runtime rejected."
  fi
  # Export for the caller (via files, not eval-unsafe).
  echo "$success" > "$TMPDIR/${out_prefix}-success.txt"
  echo "${failed:-0}" > "$TMPDIR/${out_prefix}-failed.txt"
  echo "$db_runtime" > "$TMPDIR/${out_prefix}-runtime.txt"
}

check_one_db "AppStore" "$APPSTORE_DB" "appstore"
check_one_db "TestFlight" "$TESTFLIGHT_DB" "testflight"

APPSTORE_SUCCESS=$(cat "$TMPDIR/appstore-success.txt")
APPSTORE_FAILED=$(cat "$TMPDIR/appstore-failed.txt")
APPSTORE_RUNTIME=$(cat "$TMPDIR/appstore-runtime.txt")
TESTFLIGHT_SUCCESS=$(cat "$TMPDIR/testflight-success.txt")
TESTFLIGHT_FAILED=$(cat "$TMPDIR/testflight-failed.txt")
TESTFLIGHT_RUNTIME=$(cat "$TMPDIR/testflight-runtime.txt")

if [[ "$OUTPUT" == "json" ]]; then
  jq -n \
    --arg status "PASS" \
    --arg asc_app "$ASC_APP_ID" \
    --arg live_version "$LIVE_VERSION" \
    --arg live_version_id "$LIVE_VERSION_ID" \
    --arg build_id "$BUILD_ID" \
    --arg build_number "$BUILD_NUMBER" \
    --arg asc_bundle "$ASC_BUNDLE_ID" \
    --arg ipa_path "$IPA_PATH" \
    --arg ipa_bundle "$IPA_BUNDLE_ID" \
    --arg ipa_version "$IPA_SHORT_VERSION" \
    --arg ipa_build "$IPA_BUILD_NUMBER" \
    --arg embedded_runtime "$EMBEDDED_RUNTIME" \
    --arg expected_update "$EXPECTED_UPDATE_ID" \
    --arg expected_runtime "$EXPECTED_RUNTIME" \
    --arg appstore_db "$APPSTORE_DB" \
    --arg appstore_runtime "$APPSTORE_RUNTIME" \
    --argjson appstore_success "$APPSTORE_SUCCESS" \
    --argjson appstore_failed "$APPSTORE_FAILED" \
    --arg appstore_evidence "$APPSTORE_EVIDENCE" \
    --arg appstore_udid "${APPSTORE_UDID:-}" \
    --arg testflight_db "$TESTFLIGHT_DB" \
    --arg testflight_runtime "$TESTFLIGHT_RUNTIME" \
    --argjson testflight_success "$TESTFLIGHT_SUCCESS" \
    --argjson testflight_failed "$TESTFLIGHT_FAILED" \
    --arg testflight_evidence "$TESTFLIGHT_EVIDENCE" \
    --arg testflight_udid "${TESTFLIGHT_UDID:-}" \
    '{status:$status, asc_app:$asc_app, live_version:$live_version, live_version_id:$live_version_id, build_id:$build_id, build_number:$build_number, asc_bundle:$asc_bundle, ipa_path:$ipa_path, ipa_bundle:$ipa_bundle, ipa_version:$ipa_version, ipa_build:$ipa_build, embedded_runtime:$embedded_runtime, expected_update:$expected_update, expected_runtime:$expected_runtime, appstore:{db:$appstore_db, runtime:$appstore_runtime, successful_launch_count:$appstore_success, failed_launch_count:$appstore_failed, evidence:$appstore_evidence, udid:$appstore_udid}, testflight:{db:$testflight_db, runtime:$testflight_runtime, successful_launch_count:$testflight_success, failed_launch_count:$testflight_failed, evidence:$testflight_evidence, udid:$testflight_udid}, note:"caller-provided device proof; script did not observe installation"}'
else
  cat <<OUT
PASS: OTA verified from caller-provided device proof (script did not observe installation).
  ASC app: $ASC_APP_ID (paginated READY_FOR_SALE IOS count: $LIVE_COUNT)
  Live version: $LIVE_VERSION ($LIVE_VERSION_ID) build $BUILD_ID (build number $BUILD_NUMBER) bundle $ASC_BUNDLE_ID
  IPA: $IPA_PATH bundle $IPA_BUNDLE_ID version $IPA_SHORT_VERSION build $IPA_BUILD_NUMBER runtime $EMBEDDED_RUNTIME (matches --expected-runtime)
  Intended update: $EXPECTED_UPDATE_ID
  App Store db: $APPSTORE_DB success=$APPSTORE_SUCCESS failed=$APPSTORE_FAILED runtime=$APPSTORE_RUNTIME evidence="$APPSTORE_EVIDENCE"${APPSTORE_UDID:+ udid=$APPSTORE_UDID}
  TestFlight db: $TESTFLIGHT_DB success=$TESTFLIGHT_SUCCESS failed=$TESTFLIGHT_FAILED runtime=$TESTFLIGHT_RUNTIME evidence="$TESTFLIGHT_EVIDENCE"${TESTFLIGHT_UDID:+ udid=$TESTFLIGHT_UDID}
OUT
fi
