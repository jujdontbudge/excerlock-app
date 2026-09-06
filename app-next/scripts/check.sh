#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
npm run typecheck
npm test
npm run lint
npx expo install --check
npx expo-doctor
npx expo export --platform ios --max-workers 4
