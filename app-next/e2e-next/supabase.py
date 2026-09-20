#!/usr/bin/env python3
"""Supabase admin helper for the e2e-next harness.

Used by the email sign-in lane (E2E-A3) to mint the six-digit OTP server-side
(plan §5: "auth.admin.generateLink / OTP retrieval ... no inbox scraping") and by
E2E-A4 to assert the deleted user is gone from the auth project.

Credentials come from the environment, never the repository:
``SUPABASE_URL`` + ``SUPABASE_SERVICE_ROLE_KEY`` read through ``harness.env_value``.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

from harness import env_value, validate_remote_url


class SupabaseAdmin:
    def __init__(self, url: str | None = None, service_key: str | None = None) -> None:
        configured_url = url or env_value('SUPABASE_URL', '') or ''
        self.url = validate_remote_url(
            configured_url,
            'Supabase URL',
            allowed_suffixes=('.supabase.co',),
        ) if configured_url else ''
        self.key = service_key or env_value('SUPABASE_SERVICE_ROLE_KEY', '') or ''
        if not self.url or not self.key:
            raise RuntimeError(
                'supabase.py: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured '
                '(process env, ~/.excerlock/env, or ~/.excerlock/<VAR>)'
            )

    def request(self, method: str, path: str, body: dict[str, Any] | None = None, *, timeout: float = 30.0
                ) -> tuple[int, Any]:
        data = json.dumps(body).encode() if body is not None else None
        request = urllib.request.Request(
            f'{self.url}{path}',
            data=data,
            headers={
                'apikey': self.key,
                'Authorization': f'Bearer {self.key}',
                'Content-Type': 'application/json',
            },
            method=method,
        )
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

    # -- email OTP --------------------------------------------------------- #
    def generate_email_otp(self, email: str, *, kind: str = 'magiclink') -> str:
        """Mint the sign-in code for ``email`` without touching an inbox.

        ``generate_link`` returns ``email_otp`` alongside the action link; the
        client's ``verifyOtp`` accepts that six-digit code.
        """
        status, payload = self.request('POST', '/auth/v1/admin/generate_link', {'type': kind, 'email': email})
        if status >= 300 or not isinstance(payload, dict):
            raise RuntimeError(f'supabase.py: generate_link({kind}) failed ({status}): {payload}')
        code = str(payload.get('email_otp') or '')
        if not code:
            raise RuntimeError(f'supabase.py: generate_link({kind}) returned no email_otp for {email}')
        return code

    def generate_email_change_otp(self, email: str, new_email: str) -> str:
        """Mint the email-change code an anonymous account uses to link an email.

        ``updateUser({email})`` on an anonymous session starts an email_change
        flow; the admin API exposes the matching code for that pending change.
        """
        attempts = (
            {'type': 'email_change_new', 'email': email, 'new_email': new_email},
            {'type': 'email_change_current', 'email': email, 'new_email': new_email},
        )
        last: str = ''
        for body in attempts:
            status, payload = self.request('POST', '/auth/v1/admin/generate_link', body)
            if status < 300 and isinstance(payload, dict) and payload.get('email_otp'):
                return str(payload['email_otp'])
            last = f'{status}: {payload}'
        raise RuntimeError(f'supabase.py: email-change code unavailable for {new_email} ({last})')

    # -- users ------------------------------------------------------------- #
    def find_user_by_email(self, email: str) -> dict[str, Any] | None:
        page = 1
        while page <= 20:
            status, payload = self.request('GET', f'/auth/v1/admin/users?page={page}&per_page=200')
            if status >= 300 or not isinstance(payload, dict):
                return None
            users = payload.get('users') or []
            for user in users:
                if (user.get('email') or '').lower() == email.lower():
                    return user
            if len(users) < 200:
                return None
            page += 1
        return None

    def user(self, user_id: str) -> tuple[int, Any]:
        return self.request('GET', f'/auth/v1/admin/users/{user_id}')

    def mint_session(self, email: str) -> dict[str, Any]:
        """Mint a real session (access token) for a disposable identity.

        The plan's §5 rule for the sign-in lane: obtain the token server-side
        with the service key instead of scraping an inbox or driving a browser.
        """
        status, payload = self.request('POST', '/auth/v1/admin/generate_link', {'type': 'magiclink', 'email': email})
        if status >= 300 or not isinstance(payload, dict) or not payload.get('hashed_token'):
            raise RuntimeError(f'supabase.py: generate_link for a session failed ({status}): {payload}')
        status, verified = self.request('POST', '/auth/v1/verify',
                                        {'type': 'magiclink', 'token_hash': payload['hashed_token']})
        if status >= 300 or not isinstance(verified, dict) or not verified.get('access_token'):
            raise RuntimeError(f'supabase.py: verify failed ({status}): {verified}')
        return verified

    def delete_user(self, user_id: str) -> int:
        status, _ = self.request('DELETE', f'/auth/v1/admin/users/{user_id}')
        return status
