#!/usr/bin/env python3
"""Adapty server-side API helper for the e2e-next harness.

The SIM lane cannot mint an *entitled* profile by purchasing: a purchase needs
the StoreKit binding §8.1 leaves unresolved and a sandbox purchase needs
hardware (SBX lane). Adapty's server-side API can instead grant a real access
level to a profile that already exists, which is what the existing-user fixture
uses:

* ``GET    /profile/``                                — read the profile
* ``POST   /profile/``                                — create it (grants need a profile)
* ``POST   /purchase/profile/grant/access-level/``    — grant ``premium`` with an expiry
* ``POST   /purchase/profile/revoke/access-level/``   — revoke it (fixture teardown)
* ``DELETE /profile/``                                — remove the disposable test profile

Contract source (checked 2026-09): Adapty server-side API, operation
``grantAccessLevel``/``revokeAccessLevel`` — base
``https://api.adapty.io/api/v2/server-side-api``, header
``Authorization: Api-Key <secret>``, the target profile named by the
``adapty-customer-user-id`` header, body ``{"access_level_id": "premium",
"starts_at": ..., "expires_at": ...}``. The access level id is the dashboard's
*identifier* (``premium``, the ``accessLevels.premium`` key the app maps), not
its UUID (the app's Adapty app is ``9b8a6cf2-22c5-46f9-b938-35c27da2c66f``,
access level ``premium`` = ``b95ba4b6-812e-4ce4-b2ac-8416006bc40a``).

The grant is a real access level: it lands on the same profile the SDK reads,
so the app's own entitlement path (``AdaptySubscriptionAdapter`` →
``mapEntitlement``) is exercised unmodified — no runtime code is weakened for
the harness.

The secret server-side key resolves exactly like every other credential
(``harness.env_value``: process env → ``~/.excerlock/env`` →
``~/.excerlock/ADAPTY_SECRET_KEY``); it is never committed and never logged.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Any

from harness import env_value, validate_remote_url

APP_ID = '9b8a6cf2-22c5-46f9-b938-35c27da2c66f'
ACCESS_LEVEL_ID = 'premium'
BASE_URL = 'https://api.adapty.io/api/v2/server-side-api'
#: The store Adapty stamps on a server-side grant (what the SDK reports back).
ADAPTY_STORE = 'adapty'


def now_iso() -> str:
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def expires_iso(days: float) -> str:
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() + days * 86400))


def parse_iso(value: Any) -> float | None:
    if not isinstance(value, str) or not value:
        return None
    cleaned = value.strip().replace('Z', '+00:00')
    try:
        import datetime as _datetime
        return _datetime.datetime.fromisoformat(cleaned).timestamp()
    except ValueError:
        return None


class AdaptySecretMissing(RuntimeError):
    """The harness has no Adapty secret server-side key."""


class AdaptyServer:
    """Minimal server-side API client (grant/revoke/read one profile)."""

    def __init__(self, secret: str | None = None, base: str | None = None) -> None:
        self.secret = secret or env_value('ADAPTY_SECRET_KEY', '') or ''
        self.base = validate_remote_url(
            base or env_value('ADAPTY_SSAPI_URL', BASE_URL) or BASE_URL,
            'Adapty server API',
            allowed_hosts=('api.adapty.io',),
        )
        if not self.secret:
            raise AdaptySecretMissing(
                'adapty.py: no secret server-side API key: set ADAPTY_SECRET_KEY in the environment, '
                '~/.excerlock/env, or ~/.excerlock/ADAPTY_SECRET_KEY (Adapty > App settings > General > API keys)'
            )

    @staticmethod
    def configured() -> bool:
        return bool(env_value('ADAPTY_SECRET_KEY', ''))

    # -- transport --------------------------------------------------------- #
    def request(self, method: str, path: str, *, customer_user_id: str | None = None,
                body: dict[str, Any] | None = None, timeout: float = 30.0) -> tuple[int, Any]:
        data = json.dumps(body).encode() if body is not None else None
        headers = {'Authorization': f'Api-Key {self.secret}'}
        if customer_user_id:
            headers['adapty-customer-user-id'] = customer_user_id
        if data is not None:
            headers['Content-Type'] = 'application/json'
        request = urllib.request.Request(f'{self.base}{path}', data=data, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:  # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
                raw = response.read()
                return response.status, (json.loads(raw) if raw else None)
        except urllib.error.HTTPError as error:
            raw = error.read()
            try:
                return error.code, json.loads(raw) if raw else None
            except json.JSONDecodeError:
                return error.code, raw.decode(errors='replace')

    # -- operations -------------------------------------------------------- #
    def get_profile(self, customer_user_id: str) -> tuple[int, Any]:
        return self.request('GET', '/profile/', customer_user_id=customer_user_id)

    def create_profile(self, customer_user_id: str, **attributes: Any) -> tuple[int, Any]:
        return self.request('POST', '/profile/', customer_user_id=customer_user_id, body=attributes or {})

    def grant(self, customer_user_id: str, *, access_level_id: str = ACCESS_LEVEL_ID, days: float = 3.0,
              starts_at: str | None = None, expires_at: str | None = None) -> tuple[int, Any]:
        body: dict[str, Any] = {
            'access_level_id': access_level_id,
            'starts_at': starts_at or now_iso(),
            'expires_at': expires_at or expires_iso(days),
        }
        return self.request('POST', '/purchase/profile/grant/access-level/',
                            customer_user_id=customer_user_id, body=body)

    def revoke(self, customer_user_id: str, *, access_level_id: str = ACCESS_LEVEL_ID,
               revoke_at: str | None = None) -> tuple[int, Any]:
        return self.request('POST', '/purchase/profile/revoke/access-level/', customer_user_id=customer_user_id,
                            body={'access_level_id': access_level_id, 'revoke_at': revoke_at})

    def delete_profile(self, customer_user_id: str) -> tuple[int, Any]:
        return self.request('DELETE', '/profile/', customer_user_id=customer_user_id)

    # -- readbacks --------------------------------------------------------- #
    @staticmethod
    def access_level(payload: Any, access_level_id: str = ACCESS_LEVEL_ID) -> dict[str, Any] | None:
        """The named access level entry from a ProfileResponse (``{"data": {...}}``)."""
        data = payload.get('data') if isinstance(payload, dict) else None
        levels = data.get('access_levels') if isinstance(data, dict) else None
        if not isinstance(levels, list):
            return None
        for level in levels:
            if isinstance(level, dict) and level.get('access_level_id') == access_level_id:
                return level
        return None

    @classmethod
    def active(cls, payload: Any, *, access_level_id: str = ACCESS_LEVEL_ID, now: float | None = None) -> bool:
        """True when the named access level is live (started, not yet expired)."""
        level = cls.access_level(payload, access_level_id)
        if not level:
            return False
        reference = now if now is not None else time.time()
        starts = parse_iso(level.get('starts_at'))
        expires = parse_iso(level.get('expires_at'))
        if starts is not None and starts > reference:
            return False
        return expires is None or expires > reference

    def ensure_grant(self, customer_user_id: str, *, access_level_id: str = ACCESS_LEVEL_ID, days: float = 3.0,
                     min_days_left: float = 1.0) -> dict[str, Any]:
        """Make sure the profile exists and carries a live grant; returns evidence.

        Idempotent: an existing grant with enough time left is left alone, so a
        scenario can call this on every restore without extending the fixture's
        lifetime forever. The profile is created on ``404`` because a grant needs
        one, and the app creates it too when it identifies — whichever happens
        first.
        """
        evidence: dict[str, Any] = {'customerUserId': customer_user_id, 'accessLevelId': access_level_id}
        status, payload = self.get_profile(customer_user_id)
        evidence['initialStatus'] = status
        if status == 404:
            created_status, created = self.create_profile(customer_user_id)
            evidence['createdProfile'] = created_status
            if created_status >= 300:
                evidence['error'] = f'create profile failed ({created_status})'
                return evidence
            status, payload = created_status, created
        if status >= 300:
            evidence['error'] = f'get profile failed ({status})'
            return evidence
        level = self.access_level(payload, access_level_id)
        expires = parse_iso((level or {}).get('expires_at'))
        fresh_enough = expires is not None and (expires - time.time()) > min_days_left * 86400
        if self.active(payload, access_level_id=access_level_id) and fresh_enough:
            evidence['action'] = 'kept'
        else:
            granted_status, granted = self.grant(customer_user_id, access_level_id=access_level_id, days=days)
            evidence['action'] = 'granted'
            evidence['grantStatus'] = granted_status
            if granted_status >= 300:
                evidence['error'] = f'grant failed ({granted_status}): {json.dumps(granted)[:200]}'
                return evidence
            payload = granted
        evidence['active'] = self.active(payload, access_level_id=access_level_id)
        evidence['expiresAt'] = (self.access_level(payload, access_level_id) or {}).get('expires_at')
        evidence['level'] = self.access_level(payload, access_level_id)
        return evidence
