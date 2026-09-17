#!/usr/bin/env python3
"""Existing-user fixture metadata and liveness (e2e-next, plan §7.3).

The fixture itself is a plain app-container snapshot (``fixtures/existing-user``)
captured after E2E-F1 drove a real sign-in and setup on the simulator. What
makes it an *entitled, setup-complete* profile is not the container: the Supabase
session lives in the device keychain (expo-secure-store) and the premium access
level lives in Adapty — the grant is a real server-side access level, never a
fake written into the app.

This module records the identity/grant the snapshot was captured against
(``fixtures/existing-user.meta.json``) and re-asserts the grant before a
scenario restores the snapshot, so a fixture minted on one day still carries a
live entitlement days later. Teardown (E2E-F2) revokes the grant, deletes the
disposable Supabase identity and removes both files, so a torn-down fixture
cannot be mistaken for a usable one.
"""
from __future__ import annotations

import hashlib
import json
import time
from pathlib import Path
from typing import Any

from adapty import AdaptyServer
from harness import FIXTURES

NAME = 'existing-user'
SNAPSHOT = FIXTURES / NAME
METADATA = FIXTURES / f'{NAME}.meta.json'
#: How far out the fixture's grant is placed, and when it is re-asserted.
GRANT_DAYS = 3.0
MIN_DAYS_LEFT = 1.0
ASYNC_STORAGE_DIR = 'RCTAsyncLocalStorage'
#: zustand persist keys from ``createPersistedStore`` (``excerlock-next.<name>.v1``).
ONBOARDING_KEY = 'excerlock-next.onboarding.v1'
ENTITLEMENT_KEY = 'excerlock-next.entitlement.v1'


def snapshot_available() -> bool:
    return (SNAPSHOT / 'Documents').exists() or (SNAPSHOT / 'Library').exists()


def read() -> dict[str, Any] | None:
    if not METADATA.exists():
        return None
    try:
        payload = json.loads(METADATA.read_text())
    except (json.JSONDecodeError, OSError):
        return None
    return payload if isinstance(payload, dict) else None


def write(values: dict[str, Any]) -> Path:
    METADATA.parent.mkdir(parents=True, exist_ok=True)
    METADATA.write_text(json.dumps(values, indent=2) + '\n')
    return METADATA


def clear() -> None:
    """Teardown: a torn-down fixture must not look usable to a later run."""
    for path in (SNAPSHOT, METADATA):
        if path.is_dir():
            import shutil
            shutil.rmtree(path, ignore_errors=True)
        elif path.exists():
            path.unlink()


def retire(previous: dict[str, Any] | None) -> dict[str, Any]:
    """Best-effort cleanup of a previous mint before a new one replaces it.

    A fixture mint always ends in a new disposable identity; if metadata from an
    earlier mint is still around (for example E2E-A4's UI deletion removed the
    Supabase user but nobody revoked its Adapty grant), revoke that grant here so
    the sandbox does not accumulate orphaned access levels. Failures are
    evidence, never a gate on the new mint.
    """
    if not previous or not previous.get('supabaseUserId'):
        return {'retired': False, 'reason': 'no previous fixture metadata'}
    uid = str(previous['supabaseUserId'])
    evidence: dict[str, Any] = {'retired': True, 'supabaseUserId': uid, 'email': previous.get('email')}
    if AdaptyServer.configured():
        try:
            status, payload = AdaptyServer().revoke(uid)
            evidence['grantRevokeStatus'] = status
            evidence['grantRevoke'] = json.dumps(payload)[:200] if status >= 300 else 'revoked'
        except Exception as error:  # noqa: BLE001
            evidence['grantRevokeStatus'] = f'error: {error}'
    try:
        from supabase import SupabaseAdmin

        evidence['supabaseDeleteStatus'] = SupabaseAdmin().delete_user(uid)
    except Exception as error:  # noqa: BLE001
        evidence['supabaseDeleteStatus'] = f'error: {error}'
    clear()
    evidence['fixtureCleared'] = True
    return evidence


def ensure_live(ctx: Any) -> dict[str, Any]:
    """Re-assert the captured fixture's grant and identity before a scenario uses it.

    Never raises: the evidence lands in ``ctx.fixture_info['profile']`` and the
    caller decides whether a dead fixture changes the verdict (a scenario that
    needs the grant should treat ``ok`` false as a failure to reach its
    precondition).
    """
    meta = read()
    if not meta:
        return {'ok': False, 'reason': f'no fixture metadata at {METADATA}'}
    uid = str(meta.get('supabaseUserId') or '')
    evidence: dict[str, Any] = {'supabaseUserId': uid, 'email': meta.get('email')}
    if not uid:
        return {**evidence, 'ok': False, 'reason': 'fixture metadata has no supabaseUserId'}
    try:
        from supabase import SupabaseAdmin

        admin = SupabaseAdmin()
        status, _ = admin.user(uid)
        evidence['supabaseUserStatus'] = status
        if status == 404:
            evidence['ok'] = False
            evidence['reason'] = ('the captured identity no longer exists in Supabase (torn down?); '
                                 're-mint the fixture with E2E-F1')
            ctx.fixture_info.setdefault('profile', {}).update(evidence)
            return evidence
    except Exception as error:  # noqa: BLE001 - admin API unavailable is evidence, not a crash
        evidence['supabaseUserStatus'] = f'error: {error}'
    if not AdaptyServer.configured():
        evidence['ok'] = None
        evidence['reason'] = 'ADAPTY_SECRET_KEY is not configured; the captured grant was not re-asserted'
    else:
        try:
            grant = AdaptyServer().ensure_grant(uid, days=GRANT_DAYS, min_days_left=MIN_DAYS_LEFT)
            evidence['grant'] = grant
            evidence['ok'] = bool(grant.get('active'))
            evidence['grantExpiresAt'] = grant.get('expiresAt')
            if not evidence['ok']:
                evidence['reason'] = str(grant.get('error') or 'the captured grant is not active')
        except Exception as error:  # noqa: BLE001
            evidence['ok'] = False
            evidence['reason'] = f'Adapty server-side call failed: {error}'
    ctx.fixture_info.setdefault('profile', {}).update(evidence)
    return evidence


def _storage_dir(snapshot: Path) -> Path | None:
    """The captured container's AsyncStorage directory (manifest + data files)."""
    for path in snapshot.rglob(f'{ASYNC_STORAGE_DIR}*'):
        if path.is_dir():
            return path
    return None


def persisted_store_state(key: str, snapshot: Path = SNAPSHOT) -> tuple[dict[str, Any] | None, str]:
    """Read one zustand-persisted store out of the captured container.

    ``key`` is the store's AsyncStorage key (``excerlock-next.<name>.v1``); the
    zustand envelope is ``{"state": {"data": {...}}, "version": n}`` and the
    returned dict is the inner ``state.data``. AsyncStorage inlines values
    ≤1024 chars in ``manifest.json`` and writes larger ones to a file named
    after the key's md5; both lanes are read here.
    """
    if not snapshot.exists():
        return None, f'no snapshot at {snapshot}'
    storage = _storage_dir(snapshot)
    if storage is None:
        return None, f'no {ASYNC_STORAGE_DIR} directory under {snapshot}'
    manifest_path = storage / 'manifest.json'
    try:
        manifest = json.loads(manifest_path.read_text(errors='replace'))
    except (OSError, json.JSONDecodeError) as error:
        return None, f'{manifest_path.relative_to(snapshot)} is unreadable: {error}'
    if not isinstance(manifest, dict):
        return None, f'{manifest_path.relative_to(snapshot)} is not a JSON object'
    raw: str | None = manifest.get(key)
    source = f'{manifest_path.relative_to(snapshot)}[{key}]'
    if raw is None:
        data_path = storage / hashlib.md5(key.encode()).hexdigest()
        if not data_path.exists():
            return None, f'{source} is not present and {data_path.name} does not exist'
        raw = data_path.read_text(errors='replace')
        source = str(data_path.relative_to(snapshot))
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as error:
        return None, f'{source} is not valid JSON: {error}'
    state = payload.get('state') if isinstance(payload, dict) else None
    data = state.get('data') if isinstance(state, dict) else None
    if not isinstance(data, dict):
        return None, f'{source} carries no zustand state.data object'
    return data, source


def persisted_setup_complete(snapshot: Path = SNAPSHOT) -> tuple[bool | None, str]:
    """Does the snapshot's AsyncStorage already record setupComplete=true?

    The UI walk to Home is the primary proof; this reads the persisted
    ``onboarding`` store out of the captured container as the durable half
    (zustand persist writes one JSON manifest, so a lost tail write would show
    up here before a restored fixture silently boots back into setup).
    """
    state, source = persisted_store_state(ONBOARDING_KEY, snapshot)
    if state is None:
        return (None if source.startswith('no snapshot') else False), source
    complete = state.get('setupComplete') is True
    return complete, f'{source} records setupComplete={state.get("setupComplete")!r}'


def persisted_entitlement(snapshot: Path = SNAPSHOT) -> tuple[bool | None, str]:
    """Does the snapshot's persisted entitlement store record trial/active?"""
    state, source = persisted_store_state(ENTITLEMENT_KEY, snapshot)
    if state is None:
        return (None if source.startswith('no snapshot') else False), source
    status = (state.get('entitlement') or {}).get('status') if isinstance(state.get('entitlement'), dict) else None
    return status in {'active', 'trial'}, f'{source} records entitlement status {status!r}'


def captured_summary(meta: dict[str, Any] | None) -> str:
    if not meta:
        return 'no metadata'
    return (f'{meta.get("email", "?")} ({meta.get("supabaseUserId", "?")}), '
            f'captured {meta.get("capturedAt", "?")}, grant expires {meta.get("grantExpiresAt", "?")}')


def iso_now() -> str:
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
