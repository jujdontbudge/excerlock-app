#!/bin/bash
# T03 verify-ota fixture tests — invokes verify-ota.sh with a mocked `asc`.
# Covers: numeric newest 1.0.10>1.0.9, unrelated build (bundle/version/build),
# wrong DB runtime, zero launches, missing second store DB, standalone plist
# rejection, single --db-path rejection. No network, no device.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VERIFY="$SCRIPT_DIR/verify-ota.sh"
UUID="11111111-2222-3333-4444-555555555555"
UUID_HEX="11111111222233334444555555555555"
OTHER_UUID="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
RUNTIME="1"
ASC_APP="6787265352"
BUNDLE="com.johansardar.excerlock"
LIVE_VERSION="1.0.10"
BUILD_ID="BID123"
BUILD_NUMBER="42"

pass=0
fail=0
ok() { echo "ok - $1"; pass=$((pass+1)); }
notok() { echo "not ok - $1${2:+ ($2)}" >&2; fail=$((fail+1)); }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin" "$TMP/fix"

# --- Mocked ASC fixtures (numeric newest: 1.0.9 vs 1.0.10 vs 1.0.2) ---
cat > "$TMP/fix/versions.json" <<JSON
{"data":[
  {"id":"V109","attributes":{"platform":"IOS","appStoreState":"READY_FOR_SALE","versionString":"1.0.9"}},
  {"id":"V1010","attributes":{"platform":"IOS","appStoreState":"READY_FOR_SALE","versionString":"1.0.10"}},
  {"id":"V102","attributes":{"platform":"IOS","appStoreState":"READY_FOR_SALE","versionString":"1.0.2"}},
  {"id":"VTV","attributes":{"platform":"TV_OS","appStoreState":"READY_FOR_SALE","versionString":"9.9.9"}},
  {"id":"VDRAFT","attributes":{"platform":"IOS","appStoreState":"PREPARE_FOR_SUBMISSION","versionString":"2.0.0"}}
]}
JSON
cat > "$TMP/fix/version-detail.json" <<JSON
{"data":{"id":"V1010","relationships":{"build":{"data":{"id":"$BUILD_ID"}}}},"included":[{"type":"builds","id":"$BUILD_ID","attributes":{"version":"$BUILD_NUMBER","buildNumber":"$BUILD_NUMBER"}}]}
JSON
cat > "$TMP/fix/build-detail.json" <<JSON
{"data":{"id":"$BUILD_ID","attributes":{"version":"$BUILD_NUMBER","buildNumber":"$BUILD_NUMBER"}}}
JSON
cat > "$TMP/fix/app-detail.json" <<JSON
{"data":{"id":"$ASC_APP","attributes":{"bundleId":"$BUNDLE"}}}
JSON

cat > "$TMP/bin/asc" <<MOCK
#!/bin/bash
set -euo pipefail
FIX="$TMP/fix"
args="\$*"
if [[ "\$args" == *"versions"* && "\$args" == *"list"* ]]; then cat "\$FIX/versions.json"; exit 0; fi
if [[ "\$args" == *"versions"* && "\$args" == *"view"* ]]; then cat "\$FIX/version-detail.json"; exit 0; fi
if [[ "\$args" == *"builds"* && "\$args" == *"info"* ]]; then cat "\$FIX/build-detail.json"; exit 0; fi
if [[ "\$args" == *"apps"* && "\$args" == *"view"* ]]; then cat "\$FIX/app-detail.json"; exit 0; fi
echo "mock asc: unhandled args: \$args" >&2; exit 2
MOCK
chmod +x "$TMP/bin/asc"
export PATH="$TMP/bin:$PATH"

# --- Helpers to build IPA + DB fixtures ---
make_ipa() {
  local out="$1" bundle="$2" shortver="$3" buildnum="$4" runtime="$5"
  local work="$TMP/ipa-$RANDOM"
  rm -rf "$work"; mkdir -p "$work/Payload/TestApp.app"
  python3 - "$work/Payload/TestApp.app/Info.plist" "$bundle" "$shortver" "$buildnum" <<'PY'
import plistlib, sys
_, path, bundle, shortver, buildnum = sys.argv
with open(path, "wb") as f:
    plistlib.dump({"CFBundleIdentifier": bundle, "CFBundleShortVersionString": shortver, "CFBundleVersion": buildnum}, f)
PY
  python3 - "$work/Payload/TestApp.app/Expo.plist" "$runtime" <<'PY'
import plistlib, sys
_, path, runtime = sys.argv
with open(path, "wb") as f:
    plistlib.dump({"EXUpdatesRuntimeVersion": runtime}, f)
PY
  (cd "$work" && zip -qr "$out" Payload) >/dev/null
}
uuid_to_blob() {
  python3 -c "import uuid,sys; sys.stdout.buffer.write(uuid.UUID(sys.argv[1]).bytes)" "$1"
}
make_db() {
  local out="$1" uuid="$2" success="$3" runtime="$4"
  rm -f "$out"
  sqlite3 "$out" "CREATE TABLE updates (id BLOB PRIMARY KEY, runtime_version TEXT, successful_launch_count INTEGER, failed_launch_count INTEGER, status TEXT);"
  local hex
  hex=$(echo "$uuid" | tr -d '-' | tr '[:upper:]' '[:lower:]')
  sqlite3 "$out" "INSERT INTO updates (id, runtime_version, successful_launch_count, failed_launch_count, status) VALUES (x'$hex', '$runtime', $success, 0, 'ready');"
}
make_db_missing_id() {
  local out="$1"
  rm -f "$out"
  sqlite3 "$out" "CREATE TABLE updates (id BLOB PRIMARY KEY, runtime_version TEXT, successful_launch_count INTEGER, failed_launch_count INTEGER, status TEXT);"
  local hex
  hex=$(echo "$OTHER_UUID" | tr -d '-' | tr '[:upper:]' '[:lower:]')
  sqlite3 "$out" "INSERT INTO updates (id, runtime_version, successful_launch_count, failed_launch_count, status) VALUES (x'$hex', '$RUNTIME', 5, 0, 'ready');"
}

GOOD_IPA="$TMP/good.ipa"
make_ipa "$GOOD_IPA" "$BUNDLE" "$LIVE_VERSION" "$BUILD_NUMBER" "$RUNTIME"
GOOD_STORE_DB="$TMP/appstore-good.db"
GOOD_TEST_DB="$TMP/testflight-good.db"
make_db "$GOOD_STORE_DB" "$UUID" 2 "$RUNTIME"
make_db "$GOOD_TEST_DB" "$UUID" 3 "$RUNTIME"

run_verify() {
  set +e
  out=$("$VERIFY" "$@" 2>&1)
  code=$?
  set -e
  echo "$out"
  return $code
}

# 1. PASS with numeric newest 1.0.10
set +e
out=$(run_verify --asc-app-id "$ASC_APP" --expected-update-id "$UUID" --expected-runtime "$RUNTIME" --ipa "$GOOD_IPA" --appstore-db "$GOOD_STORE_DB" --testflight-db "$GOOD_TEST_DB" --appstore-evidence "UDID=A store=AppStore launches=2" --testflight-evidence "UDID=A store=TestFlight launches=2" --output text 2>&1); code=$?
set -e
if [[ $code -eq 0 && "$out" == *"PASS"* && "$out" == *"1.0.10"* && "$out" == *"$BUNDLE"* && "$out" == *"did not observe installation"* ]]; then ok "pass binds numeric-newest 1.0.10 + bundle/build + dual dbs"; else notok "pass binds numeric-newest" "code=$code out=$out"; fi

# 2. Unrelated build: wrong bundle
BAD_BUNDLE_IPA="$TMP/bad-bundle.ipa"
make_ipa "$BAD_BUNDLE_IPA" "com.example.other" "$LIVE_VERSION" "$BUILD_NUMBER" "$RUNTIME"
set +e
out=$(run_verify --asc-app-id "$ASC_APP" --expected-update-id "$UUID" --expected-runtime "$RUNTIME" --ipa "$BAD_BUNDLE_IPA" --appstore-db "$GOOD_STORE_DB" --testflight-db "$GOOD_TEST_DB" --appstore-evidence "e1" --testflight-evidence "e2" 2>&1); code=$?
set -e
if [[ $code -ne 0 && "$out" == *"FAIL"* && "$out" == *"bundle"* ]]; then ok "unrelated bundle rejected"; else notok "unrelated bundle rejected" "code=$code out=$out"; fi

# 3. Unrelated build: wrong build number
BAD_BUILD_IPA="$TMP/bad-build.ipa"
make_ipa "$BAD_BUILD_IPA" "$BUNDLE" "$LIVE_VERSION" "999" "$RUNTIME"
set +e
out=$(run_verify --asc-app-id "$ASC_APP" --expected-update-id "$UUID" --expected-runtime "$RUNTIME" --ipa "$BAD_BUILD_IPA" --appstore-db "$GOOD_STORE_DB" --testflight-db "$GOOD_TEST_DB" --appstore-evidence "e1" --testflight-evidence "e2" 2>&1); code=$?
set -e
if [[ $code -ne 0 && "$out" == *"FAIL"* && "$out" == *"build number"* ]]; then ok "unrelated build number rejected"; else notok "unrelated build number rejected" "code=$code out=$out"; fi

# 4. Unrelated build: wrong marketing version
BAD_VER_IPA="$TMP/bad-ver.ipa"
make_ipa "$BAD_VER_IPA" "$BUNDLE" "9.9.9" "$BUILD_NUMBER" "$RUNTIME"
set +e
out=$(run_verify --asc-app-id "$ASC_APP" --expected-update-id "$UUID" --expected-runtime "$RUNTIME" --ipa "$BAD_VER_IPA" --appstore-db "$GOOD_STORE_DB" --testflight-db "$GOOD_TEST_DB" --appstore-evidence "e1" --testflight-evidence "e2" 2>&1); code=$?
set -e
if [[ $code -ne 0 && "$out" == *"FAIL"* && "$out" == *"marketing version"* ]]; then ok "unrelated marketing version rejected"; else notok "unrelated marketing version rejected" "code=$code out=$out"; fi

# 5. Wrong DB runtime
WRONG_RT_DB="$TMP/wrong-rt.db"
make_db "$WRONG_RT_DB" "$UUID" 2 "2"
set +e
out=$(run_verify --asc-app-id "$ASC_APP" --expected-update-id "$UUID" --expected-runtime "$RUNTIME" --ipa "$GOOD_IPA" --appstore-db "$WRONG_RT_DB" --testflight-db "$GOOD_TEST_DB" --appstore-evidence "e1" --testflight-evidence "e2" 2>&1); code=$?
set -e
if [[ $code -ne 0 && "$out" == *"FAIL"* && "$out" == *"runtime_version"* ]]; then ok "wrong DB runtime rejected"; else notok "wrong DB runtime rejected" "code=$code out=$out"; fi

# 6. Zero launches
ZERO_DB="$TMP/zero.db"
make_db "$ZERO_DB" "$UUID" 0 "$RUNTIME"
set +e
out=$(run_verify --asc-app-id "$ASC_APP" --expected-update-id "$UUID" --expected-runtime "$RUNTIME" --ipa "$GOOD_IPA" --appstore-db "$ZERO_DB" --testflight-db "$GOOD_TEST_DB" --appstore-evidence "e1" --testflight-evidence "e2" 2>&1); code=$?
set -e
if [[ $code -ne 0 && "$out" == *"FAIL"* && "$out" == *"successful_launch_count"* ]]; then ok "zero launches rejected"; else notok "zero launches rejected" "code=$code out=$out"; fi

# 7. Missing second store DB
set +e
out=$(run_verify --asc-app-id "$ASC_APP" --expected-update-id "$UUID" --expected-runtime "$RUNTIME" --ipa "$GOOD_IPA" --appstore-db "$GOOD_STORE_DB" --appstore-evidence "e1" --testflight-evidence "e2" 2>&1); code=$?
set -e
if [[ $code -ne 0 && "$out" == *"RUNTIME LIMIT"* && "$out" == *"TestFlight"* ]]; then ok "missing TestFlight db is runtime limit"; else notok "missing TestFlight db" "code=$code out=$out"; fi

# 8. Standalone Expo.plist rejected
STANDALONE="$TMP/Expo.plist"
python3 - "$STANDALONE" <<'PY'
import plistlib, sys
with open(sys.argv[1], "wb") as f:
    plistlib.dump({"EXUpdatesRuntimeVersion": "1"}, f)
PY
set +e
out=$(run_verify --asc-app-id "$ASC_APP" --expected-update-id "$UUID" --expected-runtime "$RUNTIME" --ipa "$GOOD_IPA" --appstore-db "$GOOD_STORE_DB" --testflight-db "$GOOD_TEST_DB" --appstore-evidence "e1" --testflight-evidence "e2" --expo-plist "$STANDALONE" 2>&1); code=$?
set -e
if [[ $code -ne 0 && "$out" == *"FAIL"* && "$out" == *"unbound"* ]]; then ok "standalone Expo.plist rejected"; else notok "standalone Expo.plist rejected" "code=$code out=$out"; fi

# 9. Single --db-path rejected
set +e
out=$(run_verify --asc-app-id "$ASC_APP" --expected-update-id "$UUID" --expected-runtime "$RUNTIME" --ipa "$GOOD_IPA" --db-path "$GOOD_STORE_DB" --appstore-evidence "e1" --testflight-evidence "e2" 2>&1); code=$?
set -e
if [[ $code -ne 0 && "$out" == *"FAIL"* && "$out" == *"SEPARATE"* ]]; then ok "single --db-path rejected"; else notok "single --db-path rejected" "code=$code out=$out"; fi

# 10. Intended id missing in one db
MISSING_DB="$TMP/missing.db"
make_db_missing_id "$MISSING_DB"
set +e
out=$(run_verify --asc-app-id "$ASC_APP" --expected-update-id "$UUID" --expected-runtime "$RUNTIME" --ipa "$GOOD_IPA" --appstore-db "$MISSING_DB" --testflight-db "$GOOD_TEST_DB" --appstore-evidence "e1" --testflight-evidence "e2" 2>&1); code=$?
set -e
if [[ $code -ne 0 && "$out" == *"FAIL"* && "$out" == *"not present"* ]]; then ok "missing update id rejected"; else notok "missing update id rejected" "code=$code out=$out"; fi

echo "---"
echo "pass=$pass fail=$fail"
if [[ $fail -ne 0 ]]; then exit 1; fi
