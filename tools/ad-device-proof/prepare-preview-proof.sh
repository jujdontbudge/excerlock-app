#!/bin/zsh
set -eu
umask 077
cd "${0:A:h}/../.."
mkdir -p "$HOME/device-test" .excer/device-preview-proof
# Standalone preview app: embedded JS, normal preview TikTok test routing, local diagnostics.
# This flag is never written into the project, podspecs, EAS configuration or production settings.
EXCERLOCK_ENV=preview EAS_BUILD_PROFILE=preview EXPO_PUBLIC_API_URL=https://api.excerlock.com/testflight \
  SENTRY_DISABLE_AUTO_UPLOAD=true xcodebuild \
  -workspace app-next/ios/ExcerLock.xcworkspace -scheme ExcerLock -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath .excer/device-build \
  'OTHER_SWIFT_FLAGS=$(inherited) -DEXCER_DEVICE_PROOF' \
  CODE_SIGN_IDENTITY='Apple Development' CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=AX3C2B78YD \
  build > "$HOME/device-test/preview-release-build.log" 2>&1
artifact_stage=$(mktemp -d .excer/device-preview-proof/artifact.XXXXXX)
ditto .excer/device-build/Build/Products/Release-iphoneos/ExcerLock.app "$artifact_stage/ExcerLock.app"
rm -rf .excer/device-preview-proof/ExcerLock.app
mv "$artifact_stage/ExcerLock.app" .excer/device-preview-proof/ExcerLock.app
rmdir "$artifact_stage"
test -f .excer/device-preview-proof/ExcerLock.app/main.jsbundle
codesign --verify --deep --strict .excer/device-preview-proof/ExcerLock.app
