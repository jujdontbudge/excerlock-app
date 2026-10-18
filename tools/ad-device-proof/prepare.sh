#!/bin/zsh
set -eu
umask 077
cd "${0:A:h}/../.."
mkdir -p "$HOME/device-test" .excer/device-driver
cp tools/ad-device-proof/Driver.swift .excer/device-driver/Driver.swift
xcodegen generate --spec tools/ad-device-proof/project.yml --project .excer/device-driver > "$HOME/device-test/driver-generate.log"
EXCERLOCK_ENV=preview EAS_BUILD_PROFILE=preview EXPO_PUBLIC_API_URL=https://api.excerlock.com/testflight RCT_METRO_PORT=8094 SENTRY_DISABLE_AUTO_UPLOAD=true \
  xcodebuild -workspace app-next/ios/ExcerLock.xcworkspace -scheme ExcerLock \
  -configuration Debug -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath .excer/device-build CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=AX3C2B78YD \
  build > "$HOME/device-test/build-signed.log" 2>&1
xcodebuild build-for-testing -project .excer/device-driver/AdDeviceProof.xcodeproj \
  -scheme AdDeviceProof -destination 'generic/platform=iOS' \
  -derivedDataPath .excer/device-driver-build > "$HOME/device-test/driver-signed.log" 2>&1
