#!/usr/bin/env python3
"""Core of the e2e-next simulator harness.

Owns the pinned simulator (``EXCERLOCK_SIM_UDID``), the per-run output tree, the
machine-readable verdict contract and the UI/state primitives the scenarios use.
UI driving reuses ``app-next/scripts/sim.py`` (headless ``xcrun simctl`` + ``idb``);
Maestro is banned machine-wide.

Verdict contract (plan §7.3): every scenario writes exactly one ``verdict.json``
under ``out/<run>/<scenario>/`` with PASS / FAIL / BLOCKED plus a reason. A
scenario that cannot reach its precondition is BLOCKED — never SKIP-as-pass. The
scenario status is the worst status of its assertions, so a missing sibling
feature (declared through ``ctx.gate``) reports BLOCKED-until with the sibling
name instead of a bare failure.
"""
from __future__ import annotations

import contextlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Iterable, Iterator, Sequence

REPO = Path(__file__).resolve().parents[2]
APP_NEXT = REPO / 'app-next'
E2E = APP_NEXT / 'e2e-next'
OUT = E2E / 'out'
FIXTURES = E2E / 'fixtures'
BUILD_DIR = E2E / 'build'
BUNDLE_ID = 'com.johansardar.excerlock'
PINNED_SIM_NAME = 'ExcerLock-Next'
POSTHOG_PROJECT = 537075

PASS, FAIL, BLOCKED = 'PASS', 'FAIL', 'BLOCKED'


# --------------------------------------------------------------------------- #
# Credentials: process env -> ~/.excerlock/env -> ~/.excerlock/<VAR_NAME>
# (the §10.10 dotfile convention documented in scripts/check-env.ts)
# --------------------------------------------------------------------------- #

def _dotenv() -> dict[str, str]:
    path = Path(os.environ.get('EXCERLOCK_ENV_FILE', Path.home() / '.excerlock' / 'env'))
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


_DOTENV: dict[str, str] | None = None


def env_value(name: str, default: str | None = None) -> str | None:
    """Never commit credentials: read them from the environment or ~/.excerlock."""
    if os.environ.get(name):
        return os.environ[name]
    global _DOTENV
    if _DOTENV is None:
        _DOTENV = _dotenv()
    if _DOTENV.get(name):
        return _DOTENV[name]
    single = Path.home() / '.excerlock' / name
    if single.exists():
        value = single.read_text().strip()
        if value:
            return value
    return default


def api_url() -> str:
    return (env_value('EXPO_PUBLIC_API_URL') or env_value('EXCERLOCK_API_URL') or 'https://api.excerlock.com').rstrip('/')


def api_request(method: str, path: str, *, token: str | None = None, body: dict | None = None,
                timeout: float = 30.0) -> tuple[int, Any]:
    """Call the ExcerLock API (the app's own identity/deletion contract)."""
    import urllib.error
    import urllib.request
    data = json.dumps(body).encode() if body is not None else None
    # Fastify rejects an empty body when content-type says JSON, so only declare
    # the type when a body is actually sent.
    headers: dict[str, str] = {'Content-Type': 'application/json'} if data is not None else {}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    request = urllib.request.Request(f'{api_url()}{path}', data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read()
            return response.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as error:
        raw = error.read()
        try:
            return error.code, json.loads(raw) if raw else None
        except json.JSONDecodeError:
            return error.code, raw.decode(errors='replace')


# --------------------------------------------------------------------------- #
# Simulator
# --------------------------------------------------------------------------- #

def pinned_udid() -> str:
    explicit = os.environ.get('EXCERLOCK_SIM_UDID', '').strip()
    if explicit:
        return explicit
    try:
        listing = json.loads(subprocess.run(['xcrun', 'simctl', 'list', 'devices', '--json'], check=True,
                                            capture_output=True, text=True).stdout)
    except (subprocess.CalledProcessError, json.JSONDecodeError) as error:  # pragma: no cover - host dependent
        raise SystemExit(f'harness: cannot list simulators: {error}') from error
    for runtime_devices in listing.get('devices', {}).values():
        for device in runtime_devices:
            if device.get('name') == PINNED_SIM_NAME and device.get('isAvailable', True):
                return device['udid']
    raise SystemExit(
        f'harness: EXCERLOCK_SIM_UDID is unset and no "{PINNED_SIM_NAME}" simulator exists; '
        'pin an explicitly owned simulator (no default device is safe)'
    )


_SIM_MODULE: Any = None


def _iso_to_epoch(timestamp: str) -> float:
    """Parse the unified log's ISO-8601 timestamps (with or without timezone)."""
    cleaned = timestamp.strip().replace('Z', '+00:00')
    try:
        import datetime as _datetime
        return _datetime.datetime.fromisoformat(cleaned).timestamp()
    except ValueError:
        return 0.0


def simlib(udid: str):
    """Import app-next/scripts/sim.py with the pinned device already exported."""
    global _SIM_MODULE
    os.environ['EXCERLOCK_SIM_UDID'] = udid
    if _SIM_MODULE is None:
        sys.path.insert(0, str(APP_NEXT / 'scripts'))
        import sim  # type: ignore  # noqa: PLC0415 - deliberate late import
        _SIM_MODULE = sim
    return _SIM_MODULE


def shell(args: Sequence[str], check: bool = True, timeout: float | None = 120) -> subprocess.CompletedProcess:
    result = subprocess.run([str(a) for a in args], capture_output=True, text=True, timeout=timeout)
    if check and result.returncode != 0:
        raise RuntimeError(f'{" ".join(str(a) for a in args)} failed ({result.returncode}): '
                           f'{(result.stderr or result.stdout).strip()[:400]}')
    return result


def _companion_alive(companion: str | None) -> bool:
    command = ['idb'] + (['--companion', companion] if companion else []) + ['describe']
    try:
        return subprocess.run(command, capture_output=True, timeout=25).returncode == 0
    except (subprocess.TimeoutExpired, OSError):
        return False


def _running_companion(udid: str) -> str:
    """Address of an already-running companion for this device (idb_companion
    binds a TCP port and refuses to start twice for the same device)."""
    pids = shell(['pgrep', '-f', f'idb_companion --udid {udid}'], check=False).stdout.split()
    for pid in pids:
        listing = shell(['lsof', '-p', pid, '-a', '-iTCP', '-sTCP:LISTEN', '-P', '-n'], check=False).stdout
        for line in listing.splitlines()[1:]:
            match = re.search(r':(\d+)\s', line)
            if match:
                candidate = f'localhost:{match.group(1)}'
                if _companion_alive(candidate):
                    return candidate
    return ''


def ensure_companion(udid: str, log_dir: Path) -> str:
    """Make ``idb`` reachable for the pinned device; returns the companion address.

    ``idb_companion`` on this host binds TCP and only publishes the gRPC port on
    its stdout, while the ``idb`` client defaults to a unix socket. The harness
    therefore discovers or starts the companion itself and exports
    ``IDB_COMPANION`` for every child process (``app-next/scripts/sim.py``
    included).
    """
    if _companion_alive(None):
        os.environ.pop('IDB_COMPANION', None)
        return 'default-socket'
    cache = log_dir / f'companion-{udid}.json'
    if cache.exists():
        try:
            companion = json.loads(cache.read_text()).get('companion', '')
        except json.JSONDecodeError:
            companion = ''
        if companion and _companion_alive(companion):
            os.environ['IDB_COMPANION'] = companion
            return companion
    running = _running_companion(udid)
    if running:
        log_dir.mkdir(parents=True, exist_ok=True)
        cache.write_text(json.dumps({'companion': running, 'udid': udid, 'source': 'existing-process'}) + '\n')
        os.environ['IDB_COMPANION'] = running
        return running
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f'companion-{udid}.log'
    handle = log_path.open('w')
    subprocess.Popen(['idb_companion', '--udid', udid], stdout=handle, stderr=subprocess.STDOUT,
                     start_new_session=True)
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        time.sleep(1.0)
        text = log_path.read_text(errors='replace')
        match = re.search(r'"grpc_port"\s*:\s*(\d+)', text)
        if match:
            companion = f'localhost:{match.group(1)}'
            os.environ['IDB_COMPANION'] = companion
            if _companion_alive(companion):
                cache.write_text(json.dumps({'companion': companion, 'udid': udid}) + '\n')
                return companion
    raise SystemExit(f'harness: idb_companion did not become reachable for {udid}; see {log_path}')


# --------------------------------------------------------------------------- #
# Sibling-feature capability detection (source-inspected at run time)
# --------------------------------------------------------------------------- #
# The plan (report.md §0) lands B3/B4/B6/B7/B8/B10 in sibling lanes. Assertions
# that depend on them must report BLOCKED-until-<sibling> rather than FAIL while
# the source in this worktree does not carry the contract yet. Detection is
# static (the built bundle cannot be introspected cheaply) and recorded in
# verdict.json so a BLOCKED verdict is auditable.

def _read(path: Path) -> str:
    try:
        return path.read_text()
    except OSError:
        return ''


def detect_capabilities() -> dict[str, dict[str, Any]]:
    adapter = _read(APP_NEXT / 'src/runtime/analytics/PostHogAnalyticsAdapter.ts')
    navigator = _read(APP_NEXT / 'src/features/launch/RootNavigator.tsx')
    app_source = '\n'.join(
        _read(path) for path in sorted((APP_NEXT / 'src').rglob('*.ts*')) if '__tests__' not in str(path)
    )
    routes_table = adapter.split('const routes: Record<string, string> =', 1)[-1].split(';', 1)[0]
    screen_tracking = _read(APP_NEXT / 'src/runtime/analytics/useScreenTracking.ts')
    checks: dict[str, tuple[bool, str]] = {
        # B1: remoteCopy reads the locale-aware remoteConfigs array (the defect
        # the plan's §1.1 records was the singular remoteConfig field).
        'B1.remote_config_copy': (
            'remoteConfigs' in _read(APP_NEXT / 'src/runtime/subscription/AdaptySubscriptionAdapter.ts'),
            'remoteCopy reads flow.remoteConfigs[0].data (locale-aware)',
        ),
        # B4a: semanticScreenName maps onboarding/setup step ids, not just routes.
        'B4a.screen_step_mapping': (
            'step:' in adapter and bool(re.search(r'onboardingStepPattern|setupStepPattern|step: clean', adapter)),
            'semanticScreenName resolves onboarding/setup step ids to a screen plus a step prop',
        ),
        # B4b: one root-level usePathname subscriber emits screen() for every route.
        'B4b.root_screen_tracking': (
            'useScreenTracking' in screen_tracking and 'usePathname' in screen_tracking
            and ('useScreenTracking' in navigator or 'useScreenTracking' in _read(APP_NEXT / 'app/_layout.tsx')),
            'a single root-level usePathname subscriber emits screen() for every production route',
        ),
        # B6: paywall_viewed / purchase_started client funnel events.
        'B6.paywall_funnel_events': ('paywall_viewed' in app_source, 'client emits paywall_viewed'),
        # B2: paywall_error reporting through a real reportError port.
        'B2.paywall_error_reporting': (
            'paywall_error' in app_source,
            'client emits paywall_error on paywall load/purchase/restore failure',
        ),
        # B3: bundled fallback paywall (Adapty setFallback + exported JSON).
        'B3.fallback_paywall': (
            (APP_NEXT / 'assets/adapty-fallback.json').exists() and 'setFallback' in app_source,
            'assets/adapty-fallback.json exists and the SDK fallback is wired',
        ),
        # B7: signInRequired flag consumers (SetupRoute X4 / footer / sign-in route).
        'B7.signin_required_flag': (
            'signInRequired' in _read(APP_NEXT / 'src/features/setup/SetupRoute.tsx')
            or 'signInRequired' in _read(APP_NEXT / 'src/features/onboarding/welcome/WelcomeFooter.tsx'),
            'SignInScreen mounts receive a flag-backed signInRequired source',
        ),
        # B10: os_signpost stage marks beyond delegate/content/home.
        'B10.startup_marks': (
            len(re.findall(r'signposter\.emitEvent\(|beginInterval\(', _read(
                APP_NEXT / 'modules/excerlock-startup/ios/ExcerlockStartupModule.swift'))) >= 5,
            'startup module emits the five os_signpost stages',
        ),
        # A5: Sentry installed at the entry, ahead of the boot gate.
        'A5.sentry_before_boot': (
            any('initializeSentrySdk' in _read(path) for path in
                (APP_NEXT / 'index.js', APP_NEXT / 'src/runtime/productionRuntime.ts',
                 APP_NEXT / 'src/runtime/observability/installSentryAtEntry.ts',
                 APP_NEXT / 'src/runtime/observability/SentryEntry.ts'))
            or any('Sentry' in _read(path) and 'boot' in _read(path) for path in
                   (APP_NEXT / 'index.js',)),
            'Sentry initialisation runs at the entry, before the runtime boot gate',
        ),
    }
    return {
        name: {'landed': landed, 'contract': contract}
        for name, (landed, contract) in checks.items()
    }


# --------------------------------------------------------------------------- #
# Verdict
# --------------------------------------------------------------------------- #

@dataclass
class Assertion:
    id: str
    status: str
    detail: str = ''
    blocked_until: str = ''
    evidence: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {'id': self.id, 'status': self.status, 'detail': self.detail}
        if self.blocked_until:
            payload['blockedUntil'] = self.blocked_until
        if self.evidence:
            payload['evidence'] = self.evidence
        return payload


class Verdict:
    """Machine-readable per-scenario verdict (the suite's fail-closed contract)."""

    def __init__(self, scenario_id: str, title: str, lane: str = 'SIM', users: str = 'NEW') -> None:
        self.scenario_id = scenario_id
        self.title = title
        self.lane = lane
        self.users = users
        self.assertions: list[Assertion] = []
        self.artifacts: dict[str, list[str]] = {'screenshots': [], 'trees': [], 'recordings': []}
        self.notes: list[str] = []
        self.failure: str = ''
        self.blocked_reason: str = ''
        self.started = time.time()

    def check(self, assertion_id: str, ok: bool | None, detail: str = '', *, blocked_until: str = '',
              evidence: Sequence[str] = ()) -> bool:
        """Record an assertion. ``ok=None`` means the precondition is unreachable."""
        if ok is None:
            status = BLOCKED
        else:
            status = PASS if ok else FAIL
        self.assertions.append(Assertion(assertion_id, status, detail, blocked_until, list(evidence)))
        return bool(ok)

    def gate(self, capability: str, assertion_id: str, detail: str, *, capabilities: dict[str, dict[str, Any]],
             evidence: Sequence[str] = ()) -> bool:
        """Assert a sibling-feature contract. Reports BLOCKED-until when unlanded."""
        state = capabilities.get(capability, {'landed': False, 'contract': capability})
        if state['landed']:
            self.check(assertion_id, True, detail, evidence=evidence)
            return True
        self.check(assertion_id, None, f'{detail} — contract not present in this worktree ({state["contract"]})',
                   blocked_until=capability.split('.', 1)[0], evidence=evidence)
        return False

    def block(self, reason: str) -> None:
        self.blocked_reason = reason

    def fail(self, reason: str) -> None:
        self.failure = reason

    def status(self) -> str:
        if self.failure or any(a.status == FAIL for a in self.assertions):
            return FAIL
        if self.blocked_reason or any(a.status == BLOCKED for a in self.assertions):
            return BLOCKED
        return PASS

    def reason(self) -> str:
        if self.failure:
            return self.failure
        failed = [a for a in self.assertions if a.status == FAIL]
        if failed:
            return '; '.join(f'{a.id}: {a.detail}' for a in failed)
        if self.blocked_reason:
            return self.blocked_reason
        blocked = [a for a in self.assertions if a.status == BLOCKED]
        if blocked:
            return '; '.join(f'{a.id} blocked until {a.blocked_until or "precondition"}: {a.detail}' for a in blocked)
        return 'all assertions passed'

    def as_dict(self, ctx: 'RunContext') -> dict[str, Any]:
        ended = time.time()
        return {
            'scenario': self.scenario_id,
            'title': self.title,
            'lane': self.lane,
            'users': self.users,
            'status': self.status(),
            'reason': self.reason(),
            'startedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(self.started)),
            'endedAt': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(ended)),
            'durationSeconds': round(ended - self.started, 1),
            'device': ctx.device,
            'build': ctx.build,
            'capabilities': ctx.capabilities,
            'fixture': ctx.fixture_info,
            'identity': ctx.identity,
            'assertions': [a.as_dict() for a in self.assertions],
            'artifacts': self.artifacts,
            'notes': self.notes,
            'posthog': ctx.posthog_trace,
        }


# --------------------------------------------------------------------------- #
# Run context
# --------------------------------------------------------------------------- #

class RunContext:
    def __init__(self, udid: str, run_id: str, scenario_id: str, build: dict[str, Any],
                 capabilities: dict[str, dict[str, Any]], *, record_video: bool = True) -> None:
        self.udid = udid
        self.run_id = run_id
        self.scenario_id = scenario_id
        self.build = build
        self.capabilities = capabilities
        self.record_video = record_video
        self.dir = OUT / run_id / scenario_id
        self.dir.mkdir(parents=True, exist_ok=True)
        self.companion = ensure_companion(udid, OUT / run_id)
        self.sim = simlib(udid)
        self.verdict = Verdict(scenario_id, getattr(self, 'title', scenario_id))
        self.fixture_info: dict[str, Any] = {}
        self.identity: dict[str, Any] = {}
        self.posthog_trace: list[dict[str, Any]] = []
        self.device: dict[str, Any] = {'udid': udid, 'name': PINNED_SIM_NAME}
        self._screens = 0
        self.log_path = self.dir / 'harness.log'

    # -- logging ---------------------------------------------------------- #
    def log(self, message: str) -> None:
        line = f'[{time.strftime("%H:%M:%S")}] {message}'
        print(f'    {line}', flush=True)
        with self.log_path.open('a') as handle:
            handle.write(line + '\n')

    def note(self, message: str) -> None:
        self.verdict.notes.append(message)

    def gate(self, capability: str, assertion_id: str, detail: str, evidence: Sequence[str] = ()) -> bool:
        """Assert a sibling contract; BLOCKED-until when it is not in this worktree."""
        return self.verdict.gate(capability, assertion_id, detail, capabilities=self.capabilities, evidence=evidence)

    # -- artifacts -------------------------------------------------------- #
    def screenshot(self, name: str, *, shrink: bool = False) -> Path:
        self._screens += 1
        path = self.dir / f'{self._screens:02d}-{name}.png'
        self.sim.screenshot(path)
        if shrink:
            # Evidence stays readable at a fraction of the size; the video keeps full fidelity.
            shell(['sips', '-Z', '700', str(path)], check=False)
        self.verdict.artifacts['screenshots'].append(path.name)
        tree_path = path.with_suffix('.tree.json')
        try:
            tree_path.write_text(json.dumps(self.sim.tree(), indent=1))
            self.verdict.artifacts['trees'].append(tree_path.name)
        except Exception as error:  # accessibility tree is evidence, not a gate
            self.log(f'accessibility tree capture failed: {error}')
        return path

    @contextlib.contextmanager
    def recording(self, name: str = 'recording') -> Iterator[None]:
        if not self.record_video:
            yield
            return
        path = self.dir / f'{name}.mp4'
        self.verdict.artifacts['recordings'].append(path.name)
        with self.sim.recording(path):
            yield

    def write_verdict(self) -> Path:
        path = self.dir / 'verdict.json'
        payload = self.verdict.as_dict(self)
        path.write_text(json.dumps(payload, indent=2) + '\n')
        return path

    # -- app lifecycle ---------------------------------------------------- #
    def terminate(self) -> None:
        shell(['xcrun', 'simctl', 'terminate', self.udid, BUNDLE_ID], check=False)

    def launch(self, *, wait: float = 0.0, arguments: Sequence[str] = ()) -> float:
        """Launch the installed app; returns the wall-clock launch call duration."""
        started = time.monotonic()
        shell(['xcrun', 'simctl', 'launch', self.udid, BUNDLE_ID, *arguments], check=True, timeout=120)
        if wait:
            time.sleep(wait)
        return time.monotonic() - started

    def cold_launch(self, *, wait: float = 0.0) -> float:
        self.terminate()
        time.sleep(0.6)
        return self.launch(wait=wait)

    def app_container(self, kind: str = 'data') -> Path:
        out = shell(['xcrun', 'simctl', 'get_app_container', self.udid, BUNDLE_ID, kind]).stdout.strip()
        return Path(out)

    def documents(self) -> Path:
        return self.app_container() / 'Documents'

    def app_version(self) -> dict[str, Any]:
        info = self.app_container('app') / 'Info.plist'
        version: dict[str, Any] = {}
        if info.exists():
            for key in ('CFBundleShortVersionString', 'CFBundleVersion'):
                value = shell(['/usr/libexec/PlistBuddy', '-c', f'Print :{key}', str(info)], check=False).stdout.strip()
                version[key] = value
        return version

    def installed(self) -> bool:
        return shell(['xcrun', 'simctl', 'get_app_container', self.udid, BUNDLE_ID, 'app'], check=False).returncode == 0

    def install(self, app: Path) -> None:
        shell(['xcrun', 'simctl', 'install', self.udid, str(app)])

    def uninstall(self) -> None:
        shell(['xcrun', 'simctl', 'uninstall', self.udid, BUNDLE_ID], check=False)

    def erase_container_state(self) -> None:
        """A fresh-install fixture: uninstall + keychain reset + install.

        Uninstalling removes the app container (AsyncStorage, PostHog state,
        expo-updates state) but a simulator keeps the device keychain, so items
        written by an earlier install survive and expo-secure-store then fails
        with ERR_KEY_CHAIN ("a required entitlement isn't present") on the next
        launch, which the app surfaces as a boot-gate failure. Reset the owned
        device's keychain so the fresh install really starts fresh.
        """
        self.terminate()
        self.uninstall()
        shell(['xcrun', 'simctl', 'keychain', self.udid, 'reset'], check=False)
        # Privacy grants (notifications, motion, health, location) also survive an
        # uninstall on a simulator; a real fresh install starts with none.
        shell(['xcrun', 'simctl', 'privacy', self.udid, 'reset', 'all', BUNDLE_ID], check=False)
        self.install(Path(self.build['app']))

    # -- fixtures --------------------------------------------------------- #
    def snapshot_container(self, name: str) -> Path:
        target = FIXTURES / name
        if target.exists():
            shutil.rmtree(target)
        target.mkdir(parents=True)
        shutil.copytree(self.app_container(), target, dirs_exist_ok=True, symlinks=True)
        return target

    def restore_container(self, name: str) -> bool:
        source = FIXTURES / name
        if not source.exists():
            return False
        self.terminate()
        container = self.app_container()
        for entry in container.iterdir():
            if entry.name == 'Library' or entry.is_dir():
                shutil.rmtree(entry, ignore_errors=True) if entry.is_dir() else entry.unlink()
        shutil.copytree(source, container, dirs_exist_ok=True, symlinks=True)
        return True

    # -- UI driving ------------------------------------------------------- #
    def tree(self) -> list[dict[str, Any]]:
        try:
            return self.sim.tree()
        except (subprocess.CalledProcessError, json.JSONDecodeError):
            # The idb companion can exit mid-run; restart it and retry once.
            self.log('idb describe-all failed; restarting the companion and retrying once')
            self.companion = ensure_companion(self.udid, OUT / self.run_id)
            return self.sim.tree()

    def labels(self) -> list[str]:
        return [(node.get('AXLabel') or '').replace('\u00a0', ' ') for node in self.tree()]

    def find(self, label: str, timeout: float = 8.0) -> dict[str, Any] | None:
        try:
            return self.sim.find(label, timeout)
        except AssertionError:
            return None

    def wait_for(self, label: str, timeout: float = 20.0) -> bool:
        found = self.find(label, timeout)
        if found:
            self.log(f'saw "{label}"')
        else:
            self.log(f'never saw "{label}" (timeout {timeout}s)')
        return bool(found)

    def wait_for_any(self, labels: Iterable[str], timeout: float = 20.0) -> str | None:
        wanted = {label.replace('\u00a0', ' ') for label in labels}
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            seen = set(self.labels())
            for label in wanted:
                if label in seen:
                    self.log(f'saw "{label}"')
                    return label
            time.sleep(0.2)
        self.log(f'none of {sorted(wanted)} appeared in {timeout}s')
        return None

    def tap(self, label: str, timeout: float = 8.0) -> bool:
        try:
            self.sim.tap(label)
            self.log(f'tapped "{label}"')
            time.sleep(0.4)
            return True
        except (AssertionError, RuntimeError) as error:
            self.log(f'tap "{label}" failed: {error}')
            return False

    def tap_node(self, node: dict[str, Any]) -> None:
        frame = node['frame']
        command = ['idb', 'ui', 'tap', '--udid', self.udid,
                   round(frame['x'] + frame['width'] / 2), round(frame['y'] + frame['height'] / 2)]
        try:
            shell(command)
        except RuntimeError:
            self.log('idb tap failed; restarting the companion and retrying once')
            self.companion = ensure_companion(self.udid, OUT / self.run_id)
            shell(command)

    def tap_label_node(self, label: str) -> bool:
        """Tap by accessibility label even when the node is not reported as a Button."""
        node = self.find(label, 4)
        if not node:
            return False
        self.tap_node(node)
        time.sleep(0.4)
        return True

    def type_text(self, text: str) -> None:
        shell(['idb', 'ui', 'text', '--udid', self.udid, text])

    def tap_field(self, label: str | None = None) -> bool:
        """Focus a text field: by label when given, else the first TextField."""
        node = self.find(label, 4) if label else None
        if node is None:
            fields = [n for n in self.tree() if n.get('type') in {'TextField', 'TextArea', 'SecureTextField'}]
            node = fields[0] if fields else None
        if node is None:
            return False
        self.tap_node(node)
        time.sleep(0.4)
        return True

    def field_value(self) -> str:
        for node in self.tree():
            if node.get('type') in {'TextField', 'TextArea', 'SecureTextField'} and node.get('AXValue'):
                return str(node['AXValue'])
        return ''

    def fill_field(self, label: str, text: str) -> bool:
        """Type ``text`` into a field and verify it landed.

        ``idb ui text`` can drop the tail of a longer string, so the harness
        types in chunks and appends whatever the field is still missing.
        """
        self.tap_field(label)
        for attempt in range(4):
            value = self.field_value()
            if value == text:
                return True
            if value and text.startswith(value):
                self.type_text(text[len(value):])
            elif value:
                self.log(f'field holds {value!r}; retyping the full value (attempt {attempt + 1})')
                self.type_text(text)
            else:
                for index in range(0, len(text), 10):
                    self.type_text(text[index:index + 10])
                    time.sleep(0.25)
            time.sleep(0.6)
        landed = self.field_value() == text
        self.log(f'field value after typing: {self.field_value()!r} (wanted {text!r})')
        return landed

    def scroll_to(self, label: str, attempts: int = 8) -> bool:
        for _ in range(attempts):
            node = self.find(label, 0.4)
            if node and 80 < node['frame']['y'] + node['frame']['height'] / 2 < 830:
                return True
            self.sim.swipe(200, 670, 200, 260, 0.5)
            time.sleep(0.5)
        return bool(self.find(label, 1))

    def tap_scrolled(self, label: str) -> bool:
        self.scroll_to(label)
        return self.tap(label)

    def swipe_up(self, times: int = 1) -> None:
        for _ in range(times):
            self.sim.swipe(200, 670, 200, 260, 0.5)
            time.sleep(0.5)

    # -- startup trace (B10 stage signposts; ADR 0021/0033 boundaries) ------ #
    def record_startup_trace(self, output_dir: Path, time_limit: str = '25s') -> dict[str, Any]:
        """Record one Points-of-Interest launch trace and parse the stage medians.

        Uses the repository's own contract: `xcrun xctrace record` for the launch
        plus `app-next/scripts/measure-startup.sh` (which now runs
        `startup-stage-medians.cjs`). The numbers are delegate-relative
        diagnostics — ADR 0021/0033 keep the T15 cold-launch/first-frame budgets
        on a signed device build — so this is evidence, never the budget gate.
        """
        output_dir.mkdir(parents=True, exist_ok=True)
        trace = output_dir / 'startup.trace'
        if trace.exists():
            shutil.rmtree(trace)
        self.terminate()
        time.sleep(1.0)
        try:
            record = shell(['xcrun', 'xctrace', 'record', '--template', 'Points of Interest',
                            '--device', self.udid, '--time-limit', time_limit, '--launch', BUNDLE_ID,
                            '--output', str(trace)], check=False, timeout=240)
        except subprocess.TimeoutExpired:
            return {'ok': False, 'error': f'xctrace record did not finish within 240s ({time_limit} limit)'}
        if record.returncode != 0 or not trace.exists():
            return {'ok': False, 'error': (record.stderr or record.stdout).strip()[:400]}
        measure = APP_NEXT / 'scripts' / 'measure-startup.sh'
        xpath = '/trace-toc/run[@number="1"]/data/table[@schema="os-signpost"]'
        parsed = shell(['bash', str(measure), '--trace', str(trace), '--xpath', xpath,
                        '--output', str(output_dir / 'startup-measure')], check=False, timeout=600)
        medians = output_dir / 'startup-measure' / 'stage-medians.json'
        payload: dict[str, Any] = {'ok': parsed.returncode == 0, 'trace': str(trace),
                                   'stdout': parsed.stdout.strip()[:600]}
        if medians.exists():
            try:
                payload['medians'] = json.loads(medians.read_text())
            except json.JSONDecodeError:
                payload['ok'] = False
                payload['error'] = 'stage-medians.json was not valid JSON'
        elif parsed.returncode != 0:
            payload['error'] = (parsed.stderr or parsed.stdout).strip()[:400]
        return payload

    # -- accessibility helpers --------------------------------------------- #
    def nodes(self, node_type: str | None = None) -> list[dict[str, Any]]:
        return [node for node in self.tree() if node_type is None or node.get('type') == node_type]

    def button_enabled(self, label: str) -> bool | None:
        for node in self.tree():
            if (node.get('AXLabel') or '') == label:
                return bool(node.get('enabled', True))
        return None

    def choices(self) -> list[dict[str, Any]]:
        """Selectable rows: the app exposes AXValue '..., checked|unchecked' on them."""
        return [node for node in self.tree() if isinstance(node.get('AXValue'), str)
                and node['AXValue'].endswith(('checked', 'unchecked'))
                and not node['AXValue'].endswith(', unchecked, checked')]

    def unchecked_choice(self) -> dict[str, Any] | None:
        for node in self.choices():
            if node['AXValue'].endswith('unchecked') or ', unchecked' in node['AXValue']:
                return node
        return None

    # -- startup marks (B10 os_signpost stages; harness reads the sim's log) -- #
    def startup_marks(self, window_seconds: int = 240, start: str | None = None) -> dict[str, float]:
        """Read the app's own startup signposts from the simulator unified log."""
        window = ['--start', start] if start else ['--last', f'{window_seconds}s']
        result = shell([
            'xcrun', 'simctl', 'spawn', self.udid, 'log', 'show', *window,
            '--signposts', '--style', 'json',
            '--predicate', 'subsystem == "com.johansardar.excerlock.startup"',
        ], check=False, timeout=240)
        marks: dict[str, float] = {}
        for line in result.stdout.splitlines():
            line = line.strip().rstrip(',')
            if not line.startswith('{') and not line.startswith('['):
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            for item in entry if isinstance(entry, list) else [entry]:
                name = item.get('signpostName') or item.get('eventMessage') or ''
                timestamp = item.get('timestamp') or ''
                if name and timestamp and name not in marks:
                    marks[name] = _iso_to_epoch(timestamp)
        if marks:
            ordered = sorted(marks.items(), key=lambda item: item[1])
            marks = dict(ordered)
            if 'AppDelegateEntry' in marks and 'InteractiveHome' in marks:
                marks['delegateToInteractiveHome'] = marks['InteractiveHome'] - marks['AppDelegateEntry']
            if 'AppDelegateEntry' in marks and 'FirstReactChildMount' in marks:
                marks['delegateToFirstFrame'] = marks['FirstReactChildMount'] - marks['AppDelegateEntry']
        return marks

    # -- analytics -------------------------------------------------------- #
    def posthog_device_id(self, timeout: float = 45.0) -> str:
        """Read the run's $device_id from the app's own PostHog storage.

        posthog-react-native persists a single JSON blob in the app Documents
        directory (``.posthog-rn.json``); the id is generated on first launch, so
        it is the run-scoped key every assertion filters on.
        """
        path = self.documents() / '.posthog-rn.json'
        deadline = time.monotonic() + timeout
        relaunched = False
        while time.monotonic() < deadline:
            if not relaunched and time.monotonic() > deadline - timeout / 2 and not path.exists():
                # The SDK writes its device id during init; a launch that never
                # finished (or a container left mid-install) gets one more chance.
                self.log('posthog storage missing halfway through the wait; relaunching the app')
                self.cold_launch()
                relaunched = True
            if path.exists():
                try:
                    payload = json.loads(path.read_text())
                except json.JSONDecodeError:
                    time.sleep(0.5)
                    continue
                # posthog-react-native wraps the persisted map in {version, content}.
                content = payload.get('content') if isinstance(payload.get('content'), dict) else payload
                device_id = content.get('device_id') or ''
                if device_id:
                    self.identity['posthogDeviceId'] = device_id
                    self.identity['posthogDistinctId'] = content.get('distinct_id', '')
                    self.log(f'posthog $device_id = {device_id}')
                    return device_id
            time.sleep(0.5)
        self.log('posthog $device_id not found in app storage')
        return ''

    def flush_analytics(self, seconds: float = 8.0) -> None:
        """Force an analytics flush: backgrounding the app flushes the SDK queues.

        The SDK flushes on the AppState 'background' transition, so the harness
        opens another app (Settings) and waits, instead of killing the process
        (which would drop the in-flight queue).
        """
        shell(['xcrun', 'simctl', 'launch', self.udid, 'com.apple.Preferences'], check=False)
        time.sleep(seconds)

    #: System alerts the real (non-dev) build raises; the harness answers them
    #: the way a user would so the flow continues. Exact labels only, so the
    #: app's own "Allow Screen Time" primer buttons are never matched by mistake.
    SYSTEM_PROMPTS = ('Allow', 'Allow While Using App', 'Allow Once', 'OK', "Don't Allow")

    def answer_system_prompt(self, prefer: Sequence[str] = ('Allow', 'Allow While Using App', 'Allow Once', 'OK')) -> str:
        """Dismiss a simulator system alert (notifications, motion, health, ...)."""
        labels = set(self.labels())
        for label in prefer:
            if label in labels:
                self.tap(label)
                self.log(f'answered the system prompt with "{label}"')
                return label
        return ''

    def boot_failure(self) -> str:
        """The app's own boot-gate failure copy, when the runtime could not start."""
        for label in self.labels():
            if 'could not finish starting' in label or 'could not start' in label:
                return label
        return ''

    def wait_for_app(self, labels: Iterable[str], timeout: float = 60.0) -> str | None:
        """Wait for one of ``labels``; fail the verdict when the boot gate errors out."""
        wanted = {label.replace('\u00a0', ' ') for label in labels}
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            seen = set(self.labels())
            for label in wanted:
                if label in seen:
                    self.log(f'saw "{label}"')
                    return label
            failure = self.boot_failure()
            if failure:
                self.screenshot('boot-failure')
                self.verdict.fail(f'the app boot gate failed: {failure!r}')
                self.log(f'boot gate failed: {failure}')
                return None
            if self.answer_system_prompt():
                continue
            time.sleep(0.25)
        self.screenshot('unexpected-screen')
        self.log(f'none of {sorted(wanted)} appeared in {timeout}s')
        return None


# --------------------------------------------------------------------------- #
# Scenario base class
# --------------------------------------------------------------------------- #

class Scenario:
    id = 'E2E-X'
    title = ''
    lane = 'SIM'
    users = 'NEW'
    fixture = 'fresh-install'
    #: sibling contracts this scenario's assertions depend on (see detect_capabilities)
    requires: tuple[str, ...] = ()
    #: documented reason when the scenario cannot run at all in this lane
    blocked_reason = ''

    def run(self, ctx: RunContext) -> None:  # pragma: no cover - interface
        raise NotImplementedError

    # -- fixture handling -------------------------------------------------- #
    def prepare(self, ctx: RunContext) -> bool:
        """Reach the scenario's precondition. False => BLOCKED (reason recorded)."""
        if self.fixture == 'fresh-install':
            ctx.erase_container_state()
            ctx.fixture_info = {'kind': 'fresh-install', 'detail': 'simctl uninstall + install of the build under test'}
            return True
        if self.fixture == 'existing-user':
            if not ctx.restore_container('existing-user'):
                ctx.verdict.block(
                    'existing-user fixture unavailable: no app-container snapshot at '
                    f'{FIXTURES / "existing-user"}. Minting it requires a setup-complete profile, which on the '
                    'simulator requires an Adapty entitlement that only a sandbox purchase can create '
                    '(plan §7.3 SBX lane / §8.1); run the SBX lane first or pass --capture-fixture.'
                )
                ctx.fixture_info = {'kind': 'existing-user', 'detail': 'missing snapshot'}
                return False
            ctx.fixture_info = {'kind': 'existing-user', 'detail': 'app-container snapshot restored'}
            return True
        ctx.fixture_info = {'kind': 'none'}
        return True
