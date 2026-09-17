#!/usr/bin/env python3
"""PostHog HogQL helper for the e2e-next harness (plan §4.5).

Every SIM scenario ends with an assertion against PostHog project 537075 scoped
to the run's ``$device_id`` (the id the app persists in its own storage). Events
are near-real-time, so queries poll for up to 60 s before giving up.

Credentials come from the environment, never the repository:
``POSTHOG_PERSONAL_API_KEY`` (query + person:read scopes) read through
``harness.env_value`` from ``process env -> ~/.excerlock/env -> ~/.excerlock/<VAR>``.
``POSTHOG_API_HOST`` defaults to https://us.posthog.com, ``POSTHOG_PROJECT_ID``
to 537075.
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.request
from typing import Any, Callable, Iterable, Sequence

from harness import POSTHOG_PROJECT, env_value

DEFAULT_POLL_SECONDS = 60.0
POLL_INTERVAL = 4.0


def api_host() -> str:
    return (env_value('POSTHOG_API_HOST', 'https://us.posthog.com') or 'https://us.posthog.com').rstrip('/')


def project_id() -> int:
    return int(env_value('POSTHOG_PROJECT_ID', str(POSTHOG_PROJECT)) or POSTHOG_PROJECT)


def personal_key() -> str:
    key = env_value('POSTHOG_PERSONAL_API_KEY', '')
    if not key:
        raise RuntimeError(
            'posthog.py: POSTHOG_PERSONAL_API_KEY is not configured; export it or place it in ~/.excerlock/'
        )
    return key


def configured() -> bool:
    return bool(env_value('POSTHOG_PERSONAL_API_KEY', ''))


def query(hogql: str, *, timeout: float = 60.0) -> list[dict[str, Any]]:
    """Run one HogQL query, returning the raw result rows."""
    body = json.dumps({'query': {'kind': 'HogQLQuery', 'query': hogql}}).encode()
    request = urllib.request.Request(
        f'{api_host()}/api/projects/{project_id()}/query/',
        data=body,
        headers={'Authorization': f'Bearer {personal_key()}', 'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        payload = json.loads(response.read())
    if isinstance(payload, dict) and payload.get('error'):
        raise RuntimeError(f'posthog query failed: {payload["error"]}')
    results = payload.get('results', [])
    columns = [column.split(' AS ')[-1].strip('`') for column in payload.get('columns', [])]
    if columns and results and isinstance(results[0], list):
        return [dict(zip(columns, row)) for row in results]
    return results


def sql_literal(value: str) -> str:
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def device_events_sql(device_id: str, since: str, *, events: Sequence[str] = (), extra: str = '',
                      limit: int = 500) -> str:
    """HogQL for one run: events carrying the run's ``$device_id`` super property."""
    where = [f'timestamp > toDateTime({sql_literal(since)})', f'properties.$device_id = {sql_literal(device_id)}']
    if events:
        names = ', '.join(sql_literal(name) for name in events)
        where.append(f'event in ({names})')
    if extra:
        where.append(extra)
    return (
        'select event, timestamp, distinct_id, properties.$screen_name as screen_name, '
        'properties.step as step, properties.placement as placement, properties.plan_id as plan_id '
        f'from events where {" and ".join(where)} order by timestamp asc limit {limit}'
    )


def wait_for_query(hogql: str, predicate: Callable[[list[dict[str, Any]]], bool], *, timeout: float = DEFAULT_POLL_SECONDS,
                   interval: float = POLL_INTERVAL) -> tuple[list[dict[str, Any]], bool, float]:
    """Poll a query until ``predicate`` accepts the rows (near-real-time ingest).

    Returns ``(rows, satisfied, waited_seconds)``. Never raises on timeout: the
    caller decides whether the absence is a FAIL or a BLOCKED precondition.
    """
    started = time.monotonic()
    rows: list[dict[str, Any]] = []
    while True:
        try:
            rows = query(hogql)
        except (urllib.error.URLError, urllib.error.HTTPError, RuntimeError, TimeoutError):
            rows = []
        if predicate(rows):
            return rows, True, time.monotonic() - started
        if time.monotonic() - started >= timeout:
            return rows, False, time.monotonic() - started
        time.sleep(interval)


def wait_for_device_events(device_id: str, since: str, predicate: Callable[[list[dict[str, Any]]], bool], *,
                           events: Sequence[str] = (), extra: str = '', timeout: float = DEFAULT_POLL_SECONDS
                           ) -> tuple[list[dict[str, Any]], bool, float]:
    return wait_for_query(device_events_sql(device_id, since, events=events, extra=extra), predicate,
                          timeout=timeout)


def device_events(device_id: str, since: str, *, events: Sequence[str] = (), extra: str = '') -> list[dict[str, Any]]:
    return query(device_events_sql(device_id, since, events=events, extra=extra))


def person_exists(distinct_id: str) -> bool:
    rows = query(
        f'select count() from persons where id = {sql_literal(distinct_id)} '
        f'or person_id = {sql_literal(distinct_id)} limit 1'
    )
    return bool(rows and rows[0].get('count()', 0))


def events_for_distinct_id(distinct_id: str, since: str, *, limit: int = 200) -> list[dict[str, Any]]:
    return query(
        'select event, timestamp, distinct_id, properties.$screen_name as screen_name '
        f'from events where timestamp > toDateTime({sql_literal(since)}) '
        f'and distinct_id = {sql_literal(distinct_id)} order by timestamp asc limit {limit}'
    )


def screen_names(rows: Iterable[dict[str, Any]]) -> list[str]:
    return [str(row.get('screen_name') or '') for row in rows if row.get('event') == '$screen']


def summarise(rows: Iterable[dict[str, Any]]) -> str:
    return ', '.join(sorted({str(row.get('event')) for row in rows})) or 'no rows'
