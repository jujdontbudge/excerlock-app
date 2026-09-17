"""E2E-N4 — the offline paywall and the bundled fallback file (B3).

Two scenarios share the hosts-file network blackhole and the same verdict
vocabulary:

``E2E-N4`` — fresh install, Adapty unreachable from the very first launch.
    This is the plan's literal shape (§7.2, "offline first launch"). It records
    what the shipped app can do in that state: AdaptySDK-iOS 4.0.2 creates the
    profile on the server at activation (``createNewProfileOnServer`` retries
    every 100 ms until the server answers, ``Sources/Adapty.swift``) and
    ``identify`` awaits that task, so the app's identity spine (which awaits
    ``subscription.identify``) never commits and ``loadPaywall``'s
    expected-identity gate never opens. The scenario still walks real onboarding
    to the paywall, records the load-error state it observes, and reports the
    fallback render BLOCKED-until the offline-first-launch identity work —
    never as a pass.

``E2E-N4W`` — profile established by one online launch, then Adapty unreachable.
    Proves the claim the bundled file can actually carry today: with the profile
    the SDK needs already persisted, a launch that cannot reach any Adapty
    endpoint renders the paywall from ``app-next/assets/adapty-fallback.json`` —
    its remote-config title/body and its real Premium A plans — instead of the
    error state. The warm-up launch never opens the paywall, and the app's own
    ``AdaptySDK_Cached_Flow`` must not carry the placement, so nothing can
    answer the offline load except the bundled file.

The simulator has no per-device network switch, so both scenarios deny the
default-cluster Adapty endpoints in ``/etc/hosts`` and verify the denial through
the system resolver and a direct HTTPS connect; the file is restored
byte-for-byte in a ``finally``. This is a host-wide lever that lasts only for
the scenario; run it when no sibling E2E lane is mid-run.
"""
from __future__ import annotations

import hashlib
import json
import plistlib
import socket
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any

from harness import Scenario, RunContext

from .onboarding import OnboardingWalk

#: Every default-cluster endpoint AdaptySDK-iOS 4.0.2 can be asked for placement
#: content (Sources/Backend/Backend+defaultBaseUrl.swift): the API, the fallback
#: server the SDK tries when the API times out, the configs CDN and the
#: user-acquisition host. Denying all of them forces the bundled file.
ADAPTY_HOSTS = (
    'api.adapty.io',
    'fallback.adapty.io',
    'configs-cdn.adapty.io',
    'api-ua.adapty.io',
)
HOSTS_FILE = Path('/etc/hosts')
HOSTS_HEADER = '# e2e-next E2E-N4 (temporary; removed by the scenario)'
PREFERENCES = 'Library/Preferences/com.johansardar.excerlock.plist'
PROFILE_KEY = 'AdaptySDK_Purchaser_Info'
CACHED_FLOW_KEY = 'AdaptySDK_Cached_Flow'
FALLBACK_TITLE = 'Unlock ExcerLock Premium'
FALLBACK_BODY_FRAGMENT = 'Your apps stay locked until you move'
FALLBACK_PLACEMENT = 'onboarding'
#: The dashboard export's onboarding products (annual + monthly, Premium A).
FALLBACK_VENDOR_PRODUCTS = (
    'com.johansardar.excerlock.premium.a.annual',
    'com.johansardar.excerlock.premium.a.monthly',
)
#: The contract E2E-N4 needs before a first-ever launch can render anything:
#: an Adapty profile the SDK can resolve without the network. Until the runtime
#: provides one, the scenario reports the render BLOCKED-until this key.
OFFLINE_IDENTITY_BLOCKER = 'offline-first-launch-identity'


def _digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _system_resolution(host: str) -> tuple[list[str], str]:
    """Resolve through the system resolver (honours /etc/hosts), like the app."""
    try:
        infos = socket.getaddrinfo(host, 443, proto=socket.IPPROTO_TCP)
    except OSError as error:
        return [], str(error)
    return sorted({info[4][0] for info in infos}), ''


def _connection_error_code(host: str) -> tuple[int, str]:
    try:
        result = subprocess.run(
            ['curl', '-sS', '--max-time', '6', '-o', '/dev/null', '-w', '%{http_code}', f'https://{host}/'],
            capture_output=True, text=True, timeout=30)
        return result.returncode, (result.stdout + result.stderr).strip()[:300]
    except subprocess.TimeoutExpired:
        return 124, 'curl did not finish within 30s'
    except OSError as error:
        return 127, str(error)[:300]


def _flush_dns() -> None:
    subprocess.run(['sudo', '-n', 'dscacheutil', '-flushcache'], check=False, capture_output=True)
    subprocess.run(['sudo', '-n', 'killall', '-HUP', 'mDNSResponder'], check=False, capture_output=True)


def _host_already_blocked(text: str, host: str) -> bool:
    for line in text.splitlines():
        fields = line.split()
        if len(fields) >= 2 and fields[0] in {'0.0.0.0', '127.0.0.1', '::1'} and fields[1] == host:
            return True
    return False


def _read_preferences(ctx: RunContext) -> dict[str, Any]:
    """The app's own UserDefaults (Adapty stores its profile and flow cache there)."""
    path = ctx.app_container() / PREFERENCES
    if not path.exists():
        return {}
    try:
        return plistlib.loads(path.read_bytes())
    except (plistlib.InvalidFileException, OSError, ValueError):
        return {}


def _json_from_preferences(prefs: dict[str, Any], key: str) -> Any:
    value = prefs.get(key)
    if isinstance(value, bytes):
        try:
            return json.loads(value.decode('utf-8'))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None
    return None


def _find_key(node: Any, key: str) -> Any:
    if isinstance(node, dict):
        if key in node:
            return node[key]
        for value in node.values():
            found = _find_key(value, key)
            if found is not None:
                return found
    elif isinstance(node, list):
        for value in node:
            found = _find_key(value, key)
            if found is not None:
                return found
    return None


def _collect_developer_ids(node: Any, found: set[str] | None = None) -> set[str]:
    found = found if found is not None else set()
    if isinstance(node, dict):
        developer_id = node.get('developer_id')
        if isinstance(developer_id, str):
            found.add(developer_id)
        for value in node.values():
            _collect_developer_ids(value, found)
    elif isinstance(node, list):
        for value in node:
            _collect_developer_ids(value, found)
    return found


class _OfflineFallbackScenario(Scenario):
    """Shared hosts-file blackhole, app-state reads and paywall assertions."""

    lane = 'SIM'
    users = 'NEW'
    fixture = 'fresh-install'
    requires = ('B3.fallback_paywall',)
    #: mDNSResponder honours /etc/hosts, but a HUP it misses (or a positive
    #: answer already in flight) can survive one flush: poll until the resolver
    #: agrees with the file before the launch under test starts.
    DENIAL_TIMEOUT = 20.0

    # -- the /etc/hosts denial ------------------------------------------------ #
    def _deny_adapty(self, ctx: RunContext) -> bool:
        try:
            text = HOSTS_FILE.read_text()
            entries = [f'0.0.0.0 {host}' for host in ADAPTY_HOSTS if not _host_already_blocked(text, host)]
            if entries:
                with tempfile.NamedTemporaryFile('w', delete=False) as handle:
                    handle.write(text.rstrip('\n') + '\n' + HOSTS_HEADER + '\n' + '\n'.join(entries) + '\n')
                    staged = Path(handle.name)
                try:
                    self._sudo(['cp', str(staged), str(HOSTS_FILE)])
                finally:
                    staged.unlink(missing_ok=True)
                ctx.log(f'blocked {", ".join(ADAPTY_HOSTS)} via /etc/hosts')
            else:
                ctx.log('the Adapty hosts were already blocked in /etc/hosts')
            deadline = time.monotonic() + self.DENIAL_TIMEOUT
            while True:
                _flush_dns()
                addresses = {host: _system_resolution(host)[0] for host in ADAPTY_HOSTS}
                if all(found and all(address == '0.0.0.0' for address in found) for found in addresses.values()):
                    break
                if time.monotonic() >= deadline:
                    unreachable = ', '.join(f'{host}={found or "unresolved"}' for host, found in addresses.items())
                    ctx.log(f'the resolver still answers with real addresses after {self.DENIAL_TIMEOUT:.0f}s: '
                            f'{unreachable}')
                    break
                time.sleep(1.0)
        except Exception as error:  # noqa: BLE001 - the block is the precondition
            ctx.verdict.block(
                f'cannot deny the simulator network access to the Adapty hosts ({", ".join(ADAPTY_HOSTS)}): '
                f'{type(error).__name__}: {error}. The simulator has no per-device network switch and the '
                'harness blocks the host names in /etc/hosts, which needs passwordless sudo on this host.'
            )
            return False
        blocked, detail = self._unreachable(ctx)
        ctx.verdict.check('offline.adapty_unreachable', blocked,
                          f'every Adapty endpoint is denied and verified unreachable: {detail}')
        if not blocked:
            ctx.verdict.block(f'the /etc/hosts block did not take effect: {detail}')
            return False
        return True

    def _restore(self, original: bytes) -> bool:
        if HOSTS_FILE.read_bytes() == original:
            return True
        with tempfile.NamedTemporaryFile('wb', delete=False) as handle:
            handle.write(original)
            staged = Path(handle.name)
        try:
            self._sudo(['cp', str(staged), str(HOSTS_FILE)])
        finally:
            staged.unlink(missing_ok=True)
        _flush_dns()
        return HOSTS_FILE.read_bytes() == original

    @staticmethod
    def _sudo(args: list[str]) -> None:
        """Run a privileged host command, surfacing stderr in the block reason."""
        result = subprocess.run(['sudo', '-n', *args], capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            raise RuntimeError(f'sudo -n {" ".join(args)} failed ({result.returncode}): '
                               f'{(result.stderr or result.stdout).strip()[:300]}')

    def _unreachable(self, ctx: RunContext) -> tuple[bool, str]:
        report: list[str] = []
        all_blocked = True
        for host in ADAPTY_HOSTS:
            addresses, resolver_error = _system_resolution(host)
            code, detail = _connection_error_code(host)
            denied = not resolver_error and addresses and all(address == '0.0.0.0' for address in addresses)
            failed = code != 0
            all_blocked = all_blocked and denied and failed
            report.append(f'{host}: addresses={addresses or resolver_error} curl_exit={code} {detail!r}')
            ctx.log(f'network check {host}: addresses={addresses or resolver_error}, curl_exit={code}')
        return all_blocked, ' | '.join(report)

    # -- the app's own Adapty state ------------------------------------------- #
    def _wait_for_profile(self, ctx: RunContext, timeout: float = 90.0) -> tuple[dict[str, Any], float]:
        started = time.monotonic()
        while time.monotonic() - started < timeout:
            profile = self._profile(ctx)
            if profile.get('profileId') and profile.get('customerUserId'):
                return profile, time.monotonic() - started
            time.sleep(1.0)
        return {}, time.monotonic() - started

    def _profile(self, ctx: RunContext) -> dict[str, Any]:
        raw = _json_from_preferences(_read_preferences(ctx), PROFILE_KEY)
        if raw is None:
            return {}
        return {
            'profileId': _find_key(raw, 'profile_id'),
            'customerUserId': _find_key(raw, 'customer_user_id'),
            'version': _find_key(raw, 'version'),
        }

    def _cached_placements(self, ctx: RunContext) -> set[str]:
        raw = _json_from_preferences(_read_preferences(ctx), CACHED_FLOW_KEY)
        return _collect_developer_ids(raw)

    # -- the walk and the fallback assertions ---------------------------------- #
    def _walk_to_paywall(self, ctx: RunContext) -> bool:
        verdict = ctx.verdict
        launch = ctx.cold_launch(wait=2.0)
        ctx.log(f'launch under test returned in {launch:.2f}s')
        reached = ctx.wait_for_app(['Get started'], 90)
        verdict.check('offline.boots', reached,
                      'the release build boots with every Adapty endpoint denied')
        if not reached:
            verdict.block('the app never reached O01 with Adapty unreachable; see the capture in this directory')
            return False
        walk = OnboardingWalk(ctx)
        result = walk.run(stop_at='P')
        steps = result['steps']
        ctx.note(f'walk: {" -> ".join(steps)}' + (f' | stopped on: {result["stuck"]}' if result['stuck'] else ''))
        verdict.check('offline.walk_reaches_paywall', 'P' in steps,
                      f'the offline walk reached the paywall ({len(steps)} screens: {" -> ".join(steps)})'
                      if 'P' in steps else
                      'the offline walk did not reach the paywall; see the screenshots in this directory',
                      evidence=[' | '.join(steps)])
        if 'P' not in steps:
            verdict.block('the offline walk stopped before the paywall; the fallback claim is unproven')
            return False
        ctx.screenshot('offline-paywall')
        return True

    def _assert_fallback_rendered(self, ctx: RunContext, *, must_render: bool) -> None:
        """Assert the paywall rendered the bundled export.

        ``must_render`` False is the first-launch-offline shape: the app cannot
        create the Adapty profile it needs offline, so a missing title is the
        documented BLOCKED-until condition, not a regression.
        """
        verdict = ctx.verdict
        nodes = ctx.tree()
        labels = [(node.get('AXLabel') or '').replace('\u00a0', ' ').strip() for node in nodes]
        plans = [(node.get('AXLabel') or '').replace('\u00a0', ' ').strip() for node in ctx.choices()]
        if not plans:
            plans = [label for label in labels
                     if label and any(term in label.lower() for term in ('annual', 'monthly', 'year', 'month'))
                     and '$' not in label and len(label) < 60]
        prices = sorted({price for label in labels for price in _prices(label)})
        title = next((label for label in labels if FALLBACK_TITLE in label), '')
        body = next((label for label in labels if FALLBACK_BODY_FRAGMENT in label), '')
        error = next((label for label in labels if 'load' in label.lower() and 'retry' in label.lower()), '')

        ctx.note(f'offline paywall labels: {json.dumps(labels)[:1200]}')
        if not title and not must_render:
            profile = self._profile(ctx)
            cached = self._cached_placements(ctx)
            blocker = (
                f'the bundled fallback cannot render on a first-ever launch: AdaptySDK-iOS 4.0.2 creates the '
                f'profile on the server at activation (Sources/Adapty.swift createNewProfileOnServer retries every '
                f'100 ms until the backend answers) and identify awaits that task, so the app\'s identity spine '
                f'never commits and loadPaywall\'s expected-identity gate never opens. Observed the paywall '
                f'load-error state {error or "(no error label)"!r}; the app\'s own AdaptySDK_Purchaser_Info is '
                f'{"present" if profile else "absent"} and AdaptySDK_Cached_Flow holds {sorted(cached) or "nothing"}. '
                f'The fallback render itself is proven by E2E-N4W, which establishes the profile with one online '
                f'launch and then denies every Adapty endpoint.'
            )
            verdict.check('paywall.fallback_title', None, blocker, blocked_until=OFFLINE_IDENTITY_BLOCKER)
            verdict.check('paywall.fallback_body', None,
                          'same offline-first-launch identity gate as paywall.fallback_title',
                          blocked_until=OFFLINE_IDENTITY_BLOCKER)
            verdict.check('paywall.fallback_plans', None,
                          'same offline-first-launch identity gate as paywall.fallback_title',
                          blocked_until=OFFLINE_IDENTITY_BLOCKER)
            return

        verdict.check('paywall.fallback_title', bool(title),
                      f'the paywall renders the export remote-config title {FALLBACK_TITLE!r} '
                      f'(observed {title!r}; load-error state {error!r})' if title else
                      f'the fallback title {FALLBACK_TITLE!r} is not on screen; load-error state {error!r}; '
                      f'labels: {json.dumps(labels[:12])}')
        verdict.check('paywall.fallback_body', bool(body),
                      f'the paywall renders the export body copy ({FALLBACK_BODY_FRAGMENT!r})' if body else
                      'the export body copy is not on screen')
        # Two rows and prices prove the fallback flow's products reached the
        # surface; a single row means StoreKit resolved partially, which is the
        # known simulator binding gap N1 also reports rather than a B3 failure.
        if len(plans) >= 2 and prices:
            verdict.check('paywall.fallback_plans', True,
                          f'{len(plans)} plan rows {plans} at {prices} — the export onboarding placement carries '
                          f'the annual and monthly Premium A products {list(FALLBACK_VENDOR_PRODUCTS)}')
        elif title and plans:
            verdict.check('paywall.fallback_plans', None,
                          f'{len(plans)} plan row(s) {plans} but no fallback title; the simulator store binding '
                          'resolves products partially (§8.1), see the load-error state above',
                          blocked_until='StoreKit-binding')
        else:
            verdict.check('paywall.fallback_plans', False,
                          f'no complete plan list rendered ({len(plans)} rows {plans} at {prices}); the fallback '
                          'flow/products did not reach the surface')


class N4OfflineFallbackPaywall(_OfflineFallbackScenario):
    """The plan's literal offline first launch: Adapty denied from launch one.

    The app cannot render a paywall in this state (see the module docstring and
    ``_assert_fallback_rendered``); the scenario records the exact behavior and
    reports the render BLOCKED-until the identity work instead of a pass.
    """

    id = 'E2E-N4'
    title = 'First launch with Adapty unreachable renders the bundled fallback paywall'
    lane = 'SIM'
    users = 'NEW'
    fixture = 'fresh-install'
    requires = ('B3.fallback_paywall',)

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        original = HOSTS_FILE.read_bytes()
        restored = False
        try:
            ctx.log('first launch under test: no online warm-up, the app is fresh and Adapty is denied')
            if not self._deny_adapty(ctx):
                return
            with ctx.recording('E2E-N4-first-launch-offline'):
                if not self._walk_to_paywall(ctx):
                    return
                self._assert_fallback_rendered(ctx, must_render=False)
            held, held_detail = self._unreachable(ctx)
            verdict.check('offline.adapty_held_through_walk', held,
                          f'the denial still holds after the walk: {held_detail}')
        finally:
            try:
                restored = self._restore(original)
            except Exception as error:  # noqa: BLE001 - never leave the host modified
                ctx.log(f'RESTORE FAILED: {type(error).__name__}: {error}')
            verdict.check('offline.hosts_restored', restored,
                          f'/etc/hosts is byte-identical to its pre-run state (sha256 {_digest(HOSTS_FILE)[:12]})'
                          if restored else '/etc/hosts WAS NOT restored to its pre-run bytes; see harness.log')


class N4WarmProfileOfflineFallback(_OfflineFallbackScenario):
    """The provable claim: offline render with the profile the SDK needs.

    Preconditions, established and proven in order:

    1. One online launch creates the live Adapty profile the SDK resolves from
       storage; on a first-ever offline launch nothing can render (E2E-N4).
    2. That launch never opens the paywall and the app's Adapty flow cache holds
       no ``onboarding`` entry, so the offline launch has no cached placement
       that could answer.
    3. Every default-cluster Adapty endpoint is denied for the launch under test
       and the denial is verified before the walk and again after it.

    With no reachable endpoint and no cached placement, the only payload the SDK
    can serve is the bundled fallback file.
    """

    id = 'E2E-N4W'
    title = 'Offline launch renders the bundled fallback paywall (profile established online)'
    lane = 'SIM'
    users = 'NEW'
    fixture = 'fresh-install'
    requires = ('B3.fallback_paywall',)

    def run(self, ctx: RunContext) -> None:
        verdict = ctx.verdict
        original = HOSTS_FILE.read_bytes()
        restored = False
        try:
            if not self._online_profile_precondition(ctx):
                return
            if not self._deny_adapty(ctx):
                return
            with ctx.recording('E2E-N4W-offline-paywall'):
                if not self._walk_to_paywall(ctx):
                    return
                self._assert_fallback_rendered(ctx, must_render=True)
            held, held_detail = self._unreachable(ctx)
            verdict.check('offline.adapty_held_through_walk', held,
                          f'the denial still holds after the walk: {held_detail}')
        finally:
            try:
                restored = self._restore(original)
            except Exception as error:  # noqa: BLE001 - never leave the host modified
                ctx.log(f'RESTORE FAILED: {type(error).__name__}: {error}')
            verdict.check('offline.hosts_restored', restored,
                          f'/etc/hosts is byte-identical to its pre-run state (sha256 {_digest(HOSTS_FILE)[:12]})'
                          if restored else '/etc/hosts WAS NOT restored to its pre-run bytes; see harness.log')

    # -- precondition: live profile, no cached placement ---------------------- #
    def _online_profile_precondition(self, ctx: RunContext) -> bool:
        verdict, ctx_identity = ctx.verdict, ctx.identity
        online, online_detail = self._reachable('api.adapty.io')
        verdict.check('precondition.adapty_online_for_first_launch', online,
                      f'api.adapty.io is reachable for the profile-creating launch: {online_detail}')
        if not online:
            # The SDK cannot create a profile without the backend (see the module
            # docstring), so an offline walk would only re-prove E2E-N4. Stop
            # here as BLOCKED rather than burn the run and fail assertions that
            # cannot be about the app.
            verdict.block(f'the live Adapty API is unreachable before the run started: {online_detail}')
            return False
        ctx.terminate()
        ctx.launch(wait=2)
        reached = ctx.wait_for_app(['Get started'], 90)
        verdict.check('precondition.first_launch_boots', reached,
                      'the online launch boots into O01 so the identity spine runs')
        if not reached:
            verdict.block('the online launch never reached O01; see the screenshots in this directory')
            return False
        ctx.screenshot('01-online-first-launch')
        profile, waited = self._wait_for_profile(ctx, timeout=90)
        ctx_identity['adaptyProfileId'] = str(profile.get('profileId', '')) if profile else ''
        ctx_identity['adaptyCustomerUserId'] = str(profile.get('customerUserId', '')) if profile else ''
        verdict.check('precondition.adapty_profile_created', bool(profile and profile.get('customerUserId')),
                      f'the online launch created and identified the Adapty profile in {waited:.0f}s '
                      f'(profileId={profile.get("profileId", "")!r}, customerUserId='
                      f'{profile.get("customerUserId", "")!r})' if profile else
                      f'the Adapty profile was not identified within {waited:.0f}s; the offline launch could not settle',
                      evidence=[json.dumps(profile or {})[:600]])
        if not (profile and profile.get('customerUserId')):
            verdict.block('the online launch did not persist an identified Adapty profile; the offline launch '
                          'cannot settle the identity spine without one')
            return False
        cached = self._cached_placements(ctx)
        verdict.check('precondition.no_cached_flow', FALLBACK_PLACEMENT not in cached,
                      f'before the offline launch the Adapty flow cache holds {sorted(cached) or "no placement"}; '
                      f'{FALLBACK_PLACEMENT!r} is not cached, so the offline load cannot be served from cache',
                      evidence=[json.dumps(sorted(cached))])
        if FALLBACK_PLACEMENT in cached:
            verdict.block(f'the online launch cached the {FALLBACK_PLACEMENT!r} placement; the offline render could '
                          'come from cache instead of the bundled file')
            return False
        ctx.terminate()
        return True

    def _reachable(self, host: str) -> tuple[bool, str]:
        addresses, error = _system_resolution(host)
        if error:
            return False, f'resolution failed: {error}'
        code, detail = _connection_error_code(host)
        reachable = code == 0
        return reachable, f'addresses={addresses}, curl_exit={code} {detail!r}'


def _prices(label: str) -> list[str]:
    import re
    return re.findall(r'\$\s?\d+(?:\.\d{2})?', label)
