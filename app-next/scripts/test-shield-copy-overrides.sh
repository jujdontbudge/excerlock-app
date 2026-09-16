#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BINARY="$(mktemp -t shield-copy-overrides.XXXXXX)"
trap 'rm -f "$BINARY"' EXIT
xcrun swiftc \
  "$ROOT/modules/excerlock-enforcement/ios/ShieldCopyOverrides.swift" \
  "$ROOT/modules/excerlock-enforcement/Tests/ShieldCopyOverridesHarness.swift" \
  -o "$BINARY"
"$BINARY"
