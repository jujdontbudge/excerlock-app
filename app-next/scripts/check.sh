#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
npm run typecheck
npm test
node --test scripts/*.test.cjs
npm run lint
npx expo install --check
npx expo-doctor
npx expo export --platform ios --max-workers 4
node scripts/verify-no-linked-trace.cjs dist
