#!/bin/bash
# Build the standalone (Release, embedded-bundle) Trace Lab research artifact.
#
# The double opt-in must be present in the *shell environment* for both phases:
# Expo config/prebuild (identifiers, isolated App Group, updates off, pod
# exclusion) and the Xcode "Bundle React Native code and images" phase, which
# runs Metro-free `expo export:embed` inside xcodebuild. Never pass it only to
# prebuild, or the artifact embeds the ordinary config while the native project
# is research-configured (see research/linked-recorder/README.md). The prebuild
# is always a clean one so the native project and the embedded config can never
# come from different environments.
#
# Usage: scripts/build-linked-recorder-standalone.sh
#
# No options: the build always writes to the one canonical scratch location
# below, which is also what scripts/prove-linked-recorder-on-phone.sh verifies
# and installs. Passing any argument fails closed so a second artifact path can
# never drift from the documented proof.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$APP_DIR"

DERIVED_DATA="$APP_DIR/.scratch/standalone-research/DerivedData"
if [[ $# -gt 0 ]]; then
  echo "unknown argument: $1 (the standalone build always uses $DERIVED_DATA)" >&2
  exit 2
fi

export EXCERLOCK_ENV=lab
export EXCERLOCK_LINKED_RECORDER_TRACE=1

npx expo prebuild --clean --platform ios
grep -q "exclude: \['expo-dev-client', 'expo-dev-launcher', 'expo-dev-menu', 'expo-dev-menu-interface'\]" ios/Podfile || {
  echo "build failed: the standalone prebuild did not exclude the dev client from ios/Podfile" >&2
  exit 1
}
grep -q 'PROVISIONING_PROFILE_SPECIFIER = "ExcerLock Trace Lab Development"' ios/ExcerLock.xcodeproj/project.pbxproj || {
  echo "build failed: the standalone prebuild did not pin the lab signing profiles" >&2
  exit 1
}

xcodebuild \
  -workspace ios/ExcerLock.xcworkspace \
  -scheme ExcerLock \
  -configuration Release \
  -destination generic/platform=iOS \
  -derivedDataPath "$DERIVED_DATA" \
  build

APP="$DERIVED_DATA/Build/Products/Release-iphoneos/ExcerLock.app"
node "$SCRIPT_DIR/verify-standalone-research.cjs" "$APP"
echo "standalone linked-recorder research artifact: $APP"
