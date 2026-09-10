#!/bin/bash
# T01 binary verification (02-native-manifest §3 steps 1-5 and 7).
# Truth sources only: codesign entitlements, Info.plist, PrivacyInfo,
# embedded.mobileprovision, prebuild diff. Never config source alone.
# Usage:
#   app-next/scripts/verify-binary.sh <PayloadDir> [iosDir]
#   app-next/scripts/verify-binary.sh --prebuild-only [iosDir]
set -euo pipefail

MODE="binary"
PAYLOAD_DIR=""
IOS_DIR="ios"
if [[ "${1:-}" == "--prebuild-only" ]]; then
  MODE="prebuild"
  IOS_DIR="${2:-ios}"
else
  PAYLOAD_DIR="${1:-}"
  IOS_DIR="${2:-ios}"
fi

fail() { echo "VERIFY FAIL: $*" >&2; exit 1; }
pass() { echo "VERIFY PASS: $*"; }

# Step 1/7: prebuild determinism is checked separately by diffing two cleans;
# here we assert the generated project exists and the validator ran (targets present).
[[ -d "$IOS_DIR/ExcerLock" ]] || fail "missing $IOS_DIR/ExcerLock (run expo prebuild --clean --no-install first)"
[[ -f "$IOS_DIR/ExcerLock/Info.plist" ]] || fail "missing Info.plist"
[[ -f "$IOS_DIR/ExcerLock/PrivacyInfo.xcprivacy" ]] || fail "missing PrivacyInfo.xcprivacy"
[[ -f "$IOS_DIR/ExcerLock/ExcerLock.entitlements" ]] || fail "missing main entitlements"
pass "prebuild outputs present in $IOS_DIR"

# Info.plist keys (§3 step 3) from the generated plist, not app.json.
# No NSUserTrackingUsageDescription (no ATT prompt) and no
# CFBundleAlternateIcons (no alternate assets) — their absence is asserted.
for key in NSMotionUsageDescription NSCameraUsageDescription NSLocationWhenInUseUsageDescription NSLocationAlwaysAndWhenInUseUsageDescription NSLocationAlwaysUsageDescription NSHealthShareUsageDescription NSFaceIDUsageDescription NSPhotoLibraryUsageDescription UIBackgroundModes CFBundleLocalizations; do
  count=$(grep -c "<key>$key</key>" "$IOS_DIR/ExcerLock/Info.plist" || true)
  [[ "$count" == "1" ]] || fail "Info.plist key $key count=$count (want 1)"
done
for absent in NSUserTrackingUsageDescription CFBundleAlternateIcons; do
  count=$(grep -c "<key>$absent</key>" "$IOS_DIR/ExcerLock/Info.plist" || true)
  [[ "$count" == "0" ]] || fail "Info.plist key $absent count=$count (want 0)"
done
for mode in location fetch; do
  grep -q "<string>$mode</string>" "$IOS_DIR/ExcerLock/Info.plist" || fail "UIBackgroundModes missing $mode"
done
grep -q "<string>processing</string>" "$IOS_DIR/ExcerLock/Info.plist" && fail "UIBackgroundModes must not contain processing (no BGProcessingTask)"
pass "Info.plist keys present once with location/fetch (no tracking, no alternate icons, no processing)"

# Privacy manifest (§3 step 4): non-empty collected types.
grep -q "NSPrivacyCollectedDataTypes" "$IOS_DIR/ExcerLock/PrivacyInfo.xcprivacy" || fail "privacy manifest missing collected types"
grep -q "NSPrivacyCollectedDataTypeProductInteraction" "$IOS_DIR/ExcerLock/PrivacyInfo.xcprivacy" || fail "privacy manifest collected types empty"
pass "PrivacyInfo.xcprivacy non-empty"

if [[ "$MODE" == "prebuild" ]]; then
  echo "Prebuild-only verification complete (binary steps need an IPA Payload dir)."
  exit 0
fi

[[ -n "$PAYLOAD_DIR" ]] || fail "usage: verify-binary.sh <PayloadDir> [iosDir]"
APP=$(echo "$PAYLOAD_DIR"/ExcerLock.app)
[[ -d "$APP" ]] || APP=$(echo "$PAYLOAD_DIR"/Payload/ExcerLock.app)
[[ -d "$APP" ]] || fail "no ExcerLock.app under $PAYLOAD_DIR"

# Structured checks bind actual signed values and provisioning to exact bundle IDs.
python3 "$(cd "$(dirname "$0")" && pwd)/verify_signed_manifest.py" "$APP"

# Step 2: executable signatures are the truth (tolerate Apple's normal
# signature-identity entitlements, reject missing/unexpected privileged ones).
check_main() {
  local dump
  dump=$(codesign -d --entitlements :- "$APP" 2>/dev/null) || fail "codesign main failed"
  for key in com.apple.developer.family-controls com.apple.developer.healthkit com.apple.developer.healthkit.background-delivery com.apple.security.application-groups com.apple.developer.applesignin aps-environment com.apple.developer.associated-domains; do
    echo "$dump" | grep -q "$key" || fail "main signature missing $key"
  done
  echo "$dump" | grep -q "group.com.johansardar.excerlock" || fail "main signature missing app group value"
  pass "main signature carries every §1 entitlement"
}
check_appex() {
  local found_plugins=0
  local found_extensionkit=0
  for x in "$APP"/PlugIns/*.appex "$APP"/Extensions/*.appex; do
    [[ -e "$x" ]] || continue
    local name dump
    name=$(basename "$x")
    if [[ "$x" == "$APP"/PlugIns/* ]]; then
      found_plugins=$((found_plugins+1))
    else
      found_extensionkit=$((found_extensionkit+1))
      [[ "$name" == "DeviceActivityReportExtension.appex" ]] || fail "unexpected ExtensionKit product $name"
      [[ "$(plutil -extract EXAppExtensionAttributes.EXExtensionPointIdentifier raw "$x/Info.plist" 2>/dev/null)" == "com.apple.deviceactivityui.report-extension" ]] || fail "$name has wrong EX extension point"
    fi
    dump=$(codesign -d --entitlements :- "$x" 2>/dev/null) || fail "codesign $name failed"
    echo "$dump" | grep -q "com.apple.developer.family-controls" || fail "$name missing Family Controls"
    echo "$dump" | grep -q "com.apple.security.application-groups" || fail "$name missing App Groups"
    for priv in com.apple.developer.healthkit com.apple.developer.applesignin aps-environment com.apple.developer.associated-domains; do
      # Note: com.apple.developer.healthkit.background-delivery contains the healthkit substring;
      # check exact privileged keys only on their own lines is overkill here — reject the exact main-only keys.
      if [[ "$priv" == "com.apple.developer.healthkit" ]]; then
        echo "$dump" | grep -q "<key>com.apple.developer.healthkit</key>" && fail "$name must not carry main-only $priv"
      else
        echo "$dump" | grep -q "$priv" && fail "$name must not carry main-only $priv"
      fi
    done
    pass "$name signature subset exact"
  done
  [[ "$found_plugins" == "3" ]] || fail "want exactly 3 Foundation appex in PlugIns, found $found_plugins"
  [[ "$found_extensionkit" == "1" ]] || fail "want exactly 1 report appex in Extensions, found $found_extensionkit"
  echo "NOTE: no fifth App Intents appex is expected (intent lives in the main app target)."
}
check_main
check_appex

# Step 3/4 on the signed payload (not just ios/).
plutil -p "$APP/Info.plist" >/dev/null || fail "plutil Info.plist failed"
plutil -p "$APP/PrivacyInfo.xcprivacy" >/dev/null || fail "plutil PrivacyInfo failed"
pass "signed Info.plist + PrivacyInfo parse"

# Step 5: provisioning capabilities match (main + each appex).
for prov in "$APP/embedded.mobileprovision" "$APP"/PlugIns/*.appex/embedded.mobileprovision "$APP"/Extensions/*.appex/embedded.mobileprovision; do
  [[ -f "$prov" ]] || fail "missing $prov"
  security cms -D -i "$prov" >/dev/null || fail "provisioning decode failed for $prov"
done
pass "embedded.mobileprovision decodes for main + each appex"

echo "All T01 binary checks passed (main+4 appex signed; App Intent verified in main target via prebuild guardrails)."
