#!/bin/sh
# Expo's device launch opens Simulator.app. Build-only + simctl preserves headless use.
set -eu
cd "$(dirname "$0")/.."
SIM_ID=B68873CD-B6ED-4961-85AF-0C807E657999
case "${1:-launch}" in
  build) CI=1 npx expo run:ios --device generic --configuration Debug --no-bundler --output ./build ;;
  boot) xcrun simctl boot "$SIM_ID"; xcrun simctl bootstatus "$SIM_ID" -b ;;
  install) xcrun simctl install "$SIM_ID" build/ExcerLock.app ;;
  launch) xcrun simctl openurl "$SIM_ID" 'excerlock://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8091' ;;
  shutdown) xcrun simctl shutdown "$SIM_ID" ;;
  *) exit 2 ;;
esac
