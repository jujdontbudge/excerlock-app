#!/usr/bin/env python3
"""Release-style simulator build of app-next for the e2e-next harness.

Produces a Release configuration build for the pinned simulator with the
`preview` environment baked in (real Supabase/Adapty/PostHog/API, preview OTA
channel, embedded JS bundle) and installs it on the owned simulator.

Rules encoded here (storekit/README.md, app-next/scripts/README.md):
  * local native builds must not inherit production upload credentials:
    SENTRY_AUTH_TOKEN is dropped and SENTRY_DISABLE_AUTO_UPLOAD=true is set;
  * arm64 only (Apple Silicon host; cached Expo modules are arm64-only);
  * the environment is resolved from ~/.excerlock/env and passed explicitly to
    both `expo prebuild` and `xcodebuild`, so the embedded bundle and the native
    Expo.plist carry the same preview values.

Usage:
  python3 e2e-next/build.py [--udid UDID] [--no-install] [--clean] [--json OUT]

Exit codes: 0 built (and installed), 2 build/install failure.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

APP_NEXT = Path(__file__).resolve().parents[1]
REPO = APP_NEXT.parent
E2E = APP_NEXT / 'e2e-next'
DERIVED = E2E / 'build' / 'DerivedData'
BUNDLE_ID = 'com.johansardar.excerlock'
SCHEME = 'ExcerLock'
WORKSPACE = APP_NEXT / 'ios' / 'ExcerLock.xcworkspace'

# Vars the client config consumes (app-next/config/environment.ts CLIENT_ENV_NAMES).
# A preview build is worthless without the live-service ones; Google sign-in is
# optional (the OAuth client is only needed for that provider).
REQUIRED_ENV = (
    'EXPO_PUBLIC_ADAPTY_KEY',
    'EXPO_PUBLIC_POSTHOG_KEY',
    'EXPO_PUBLIC_POSTHOG_HOST',
    'SENTRY_DSN',
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    'EXPO_PUBLIC_API_URL',
)
OPTIONAL_ENV = ('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID',)
# Mirror of app-next/config/environment.ts aliases: the credential file stores
# the server-side name for several client values.
ENV_ALIASES = {
    'EXPO_PUBLIC_POSTHOG_HOST': ('POSTHOG_HOST',),
    'SENTRY_DSN': ('SENTRY_DSN_MOBILE',),
    'EXPO_PUBLIC_SUPABASE_URL': ('SUPABASE_URL',),
    'EXPO_PUBLIC_SUPABASE_ANON_KEY': ('SUPABASE_ANON_KEY',),
    'EXPO_PUBLIC_API_URL': ('EXCERLOCK_API_URL',),
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID': ('GOOGLE_IOS_CLIENT_ID', 'GOOGLE_OAUTH_IOS_CLIENT_ID'),
}


def read_dotenv(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text().splitlines():
        match = re.match(r'^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$', line)
        if not match:
            continue
        key, raw = match.groups()
        quote = raw[:1]
        values[key] = raw[1:-1] if quote in {'"', "'"} and raw.endswith(quote) else re.sub(r'\s+#.*$', '', raw).strip()
    return values


def credential_file() -> Path:
    return Path(os.environ.get('EXCERLOCK_ENV_FILE', Path.home() / '.excerlock' / 'env'))


def preview_env() -> dict[str, str]:
    """Preview build environment: the developer credential file plus the flags
    that make the build a release-style preview build."""
    values = read_dotenv(credential_file())
    env = {**os.environ, **values}
    missing = [key for key in REQUIRED_ENV if not any(env.get(name) for name in (key, *ENV_ALIASES.get(key, ())))]
    if missing:
        raise SystemExit(f'build.py: {missing} missing from {credential_file()}; cannot build a live preview app')
    absent = [key for key in OPTIONAL_ENV if not any(env.get(name) for name in (key, *ENV_ALIASES.get(key, ())))]
    if absent:
        print(f'build.py: note: {absent} not configured; that provider stays disabled in this build', file=sys.stderr)
    env['EXCERLOCK_ENV'] = 'preview'
    env['EAS_BUILD_PROFILE'] = 'preview'
    env['SENTRY_DISABLE_AUTO_UPLOAD'] = 'true'
    env.pop('SENTRY_AUTH_TOKEN', None)
    env.pop('EAS_BUILD', None)
    env.pop('CI', None)
    return env


def run(command: list[str], env: dict[str, str], cwd: Path, log: Path, label: str) -> None:
    log.parent.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    with log.open('a') as handle:
        handle.write(f'\n$ (cwd={cwd}) {label}: {" ".join(command)}\n')
        handle.flush()
        result = subprocess.run(command, cwd=cwd, env=env, stdout=handle, stderr=subprocess.STDOUT)
    elapsed = time.monotonic() - started
    with log.open('a') as handle:
        handle.write(f'--- {label} exit={result.returncode} in {elapsed:.1f}s\n')
    if result.returncode != 0:
        raise SystemExit(f'build.py: {label} failed (exit {result.returncode}); see {log}')


def app_path() -> Path:
    return DERIVED / 'Build' / 'Products' / 'Release-iphonesimulator' / 'ExcerLock.app'


def git_revision() -> str:
    return subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=REPO, capture_output=True, text=True).stdout.strip()


def app_source_revision() -> str:
    """Cache key for the built artifact: the app sources the bundle is made of.

    The harness builds once and runs every scenario on that one build, so the
    cache must change exactly when the app changes — not when the harness's own
    files change. The key is a hash of `git ls-tree -r HEAD -- app-next` with the
    harness directory itself excluded.
    """
    listing = subprocess.run(['git', 'ls-tree', '-r', 'HEAD', '--', 'app-next'], cwd=REPO,
                             capture_output=True, text=True).stdout
    entries = '\n'.join(line for line in listing.splitlines() if '/e2e-next/' not in line)
    return hashlib.sha1(entries.encode()).hexdigest()[:12]


def cache_matches(manifest: dict, app_revision: str) -> bool:
    """True when the manifest describes the current app sources (rebuild otherwise)."""
    return bool(manifest.get('appSourceRevision')) and manifest['appSourceRevision'] == app_revision


def build(udid: str, install: bool = True, clean: bool = False, log: Path | None = None) -> dict:
    env = preview_env()
    log = log or (E2E / 'build' / 'build.log')
    log.parent.mkdir(parents=True, exist_ok=True)
    log.write_text(f'# e2e-next preview build {time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}\n')

    prebuild = ['npx', 'expo', 'prebuild', '--platform', 'ios', '--no-install']
    if clean:
        prebuild.append('--clean')
    run(prebuild, env, APP_NEXT, log, 'expo-prebuild')
    run(['npx', 'pod-install', 'ios'], env, APP_NEXT, log, 'pod-install')
    run(
        [
            'xcodebuild',
            '-workspace', str(WORKSPACE),
            '-scheme', SCHEME,
            '-configuration', 'Release',
            '-sdk', 'iphonesimulator',
            '-destination', f'id={udid}',
            '-derivedDataPath', str(DERIVED),
            # Sign to run locally (Xcode's simulator default: ad-hoc, no
            # entitlements). Do not add entitlements here: a simulator build
            # carrying application-identifier/keychain-access-groups without a
            # matching provisioning profile is refused at launch, and ad-hoc
            # signing is enough for expo-secure-store once the device keychain
            # no longer holds items from an earlier install (the harness resets
            # it for the fresh-install fixture).
            'CODE_SIGN_IDENTITY=-',
            'CODE_SIGNING_ALLOWED=YES',
            'ARCHS=arm64',
            'ONLY_ACTIVE_ARCH=YES',
            'build',
        ],
        env,
        APP_NEXT,
        log,
        'xcodebuild-release',
    )
    app = app_path()
    if not app.exists():
        raise SystemExit(f'build.py: expected app missing at {app}')
    if install:
        run(['xcrun', 'simctl', 'install', udid, str(app)], env, APP_NEXT, log, 'simctl-install')
    dirty = bool(subprocess.run(['git', 'status', '--porcelain'], cwd=REPO, capture_output=True,
                                text=True).stdout.strip())
    return {
        'revision': git_revision(),
        'revisionDirty': dirty,
        'appSourceRevision': app_source_revision(),
        'app': str(app),
        'bundleId': BUNDLE_ID,
        'scheme': SCHEME,
        'configuration': 'Release',
        'environment': 'preview',
        'channel': 'preview',
        'runtimeVersion': '2',
        'derivedData': str(DERIVED),
        'log': str(log),
        'installed': install,
        'builtAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--udid', default=os.environ.get('EXCERLOCK_SIM_UDID', ''))
    parser.add_argument('--no-install', action='store_true')
    parser.add_argument('--clean', action='store_true')
    parser.add_argument('--json', default='')
    args = parser.parse_args()
    if not args.udid:
        print('build.py: --udid or EXCERLOCK_SIM_UDID is required', file=sys.stderr)
        return 2
    info = build(args.udid, install=not args.no_install, clean=args.clean)
    if args.json:
        Path(args.json).write_text(json.dumps(info, indent=2) + '\n')
    print(json.dumps(info, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
