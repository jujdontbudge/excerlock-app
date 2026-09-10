#!/bin/sh
set -eu
: "${SENTRY_AUTH_TOKEN:?SENTRY_AUTH_TOKEN is required}"
: "${SENTRY_ORG:?SENTRY_ORG is required}"
: "${SENTRY_PROJECT:?SENTRY_PROJECT is required}"
: "${EXCERLOCK_VERSION:?EXCERLOCK_VERSION is required}"
: "${EXCERLOCK_BUILD_NUMBER:?EXCERLOCK_BUILD_NUMBER is required}"
: "${EXPO_RUNTIME_VERSION:?EXPO_RUNTIME_VERSION is required}"
: "${EXPO_UPDATE_ID:?EXPO_UPDATE_ID is required}"
: "${SOURCEMAP_PATH:?SOURCEMAP_PATH is required}"
: "${BUNDLE_PATH:?BUNDLE_PATH is required}"
release="com.johansardar.excerlock@${EXCERLOCK_VERSION}+${EXCERLOCK_BUILD_NUMBER}"
dist="${EXPO_RUNTIME_VERSION}-${EXPO_UPDATE_ID}"
test -f "$SOURCEMAP_PATH"
test -f "$BUNDLE_PATH"
command -v sentry-cli >/dev/null 2>&1 || { printf '%s\n' 'sentry-cli is required' >&2; exit 127; }
exec sentry-cli sourcemaps upload --org "$SENTRY_ORG" --project "$SENTRY_PROJECT" --release "$release" --dist "$dist" --rewrite "$SOURCEMAP_PATH" "$BUNDLE_PATH"
