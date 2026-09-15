import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';

import { linkedTrace, type LinkedTracePreflight, type LinkedTraceStatus } from '@linked-trace';
import {
  Heading,
  Label,
  PrimaryButton,
  ScreenShell,
  SecondaryButton,
  StatusCard,
} from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import {
  LINK_PROTOCOL_VERSION,
  newLinkedSession,
  parseHandshake,
  walkingRecorderAppLink,
  walkingRecorderArchiveLink,
  walkingRecorderSessionLink,
  type LinkedHandshake,
} from './linkedRecorderLink';

type Phase = 'ready' | 'running' | 'review' | 'exported' | 'expired';

const NOTHING_COLLECTED = 'No GPS, microphone, camera, raw vectors, or Health history is collected.';

/**
 * The one guided research path: start here, record the ground truth in Walking
 * Recorder, finish there, then save both files here. Everything runs and stays
 * on this phone; a Mac is never needed while a test runs.
 */
export function LinkedTraceScreen() {
  const runtime = useRuntime();
  const router = useRouter();
  const entitlementStatus = useEntitlementStore((state) => state.data.entitlement.status);
  const params = useLocalSearchParams<{ sessionId?: string | string[]; nonce?: string | string[]; protocolVersion?: string | string[] }>();
  const paramSessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const paramNonce = Array.isArray(params.nonce) ? params.nonce[0] : params.nonce;
  const paramProtocol = Array.isArray(params.protocolVersion) ? params.protocolVersion[0] : params.protocolVersion;
  const handshake = useMemo(
    () => parseHandshake({ sessionId: paramSessionId, nonce: paramNonce, protocolVersion: paramProtocol }),
    [paramSessionId, paramNonce, paramProtocol],
  );
  const [phase, setPhase] = useState<Phase>('ready');
  const [status, setStatus] = useState<LinkedTraceStatus | null>(null);
  const [preflight, setPreflight] = useState<LinkedTracePreflight | null>(null);
  const [activeLink, setActiveLink] = useState<LinkedHandshake | null>(null);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [exportUri, setExportUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const linkRef = useRef<LinkedHandshake | null>(null);

  const refreshPreflight = useCallback(async () => {
    try {
      const current = await linkedTrace.preflight();
      setPreflight(current);
      return current;
    } catch {
      setError('The local readiness check could not run. Reopen Trace Lab and try again.');
      return null;
    }
  }, []);

  // One live session can only be in one of four states, so the screen always
  // lands on the current step: running, waiting to be saved, or needing cleanup.
  const settle = useCallback((current: LinkedTraceStatus, link: LinkedHandshake | null) => {
    if (current.sessionId && current.active) {
      setPhase(link?.sessionId === current.sessionId ? 'review' : 'running');
      return;
    }
    if (current.sessionId) {
      setPhase('expired');
      return;
    }
    if (link) setNote('That test was already saved on this phone, so there is nothing left to finalize.');
    setPhase((previous) => (previous === 'exported' ? previous : 'ready'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([linkedTrace.status(), linkedTrace.preflight()])
      .then(([current, readiness]) => {
        if (cancelled) return;
        setStatus(current);
        setPreflight(readiness);
        settle(current, linkRef.current);
      })
      .catch(() => {
        if (!cancelled) setError('The local readiness check could not run. Reopen Trace Lab and try again.');
      });
    return () => { cancelled = true; };
  }, [settle]);

  // Walking Recorder returns here with the one-time link when a test is done.
  useEffect(() => {
    if (!handshake) return;
    linkRef.current = handshake;
    void linkedTrace.status()
      .then((current) => { setStatus(current); settle(current, handshake); })
      .catch(() => setError('Trace Lab could not read the local trace. Try again.'));
  }, [handshake, settle]);

  // A running test must notice its own two-hour expiry and the return to foreground.
  useEffect(() => {
    if (phase !== 'running') return;
    const sync = () => { void linkedTrace.status().then((current) => { setStatus(current); settle(current, linkRef.current); }); };
    const interval = setInterval(sync, 10_000);
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') sync(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [phase, settle]);

  const labAccess = entitlementStatus === 'active' || entitlementStatus === 'trial';
  const step = readinessStep({ entitlementStatus, preflight, labAccess, runtime });

  const run = async (operation: () => Promise<unknown>, message: string): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    setError(null);
    try {
      await operation();
      await refreshPreflight();
      return true;
    } catch {
      setError(message);
      return false;
    } finally { setBusy(false); }
  };

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const latest = await refreshPreflight();
      if (!latest || readinessStep({ entitlementStatus, preflight: latest, labAccess, runtime })) {
        setError('The test did not start. Finish the step named above first.');
        return;
      }
      const link = newLinkedSession();
      const active = await linkedTrace.start(link.sessionId, link.nonce);
      setActiveLink(link);
      linkRef.current = link;
      setStatus(active);
      setPhase('running');
      try {
        await Linking.openURL(walkingRecorderSessionLink(link));
      } catch {
        setError('The trace is running, but Walking Recorder could not be opened. Open Walking Recorder from the Home Screen to record this test.');
      }
    } catch {
      setError('The trace did not start. Nothing was recorded; try again.');
    } finally { setBusy(false); }
  };

  const saveTrace = async () => {
    const link = activeLink ?? handshake;
    if (!link || busy) return;
    setBusy(true);
    setError(null);
    try {
      const uri = await linkedTrace.stop(link.sessionId, link.nonce);
      setExportUri(uri);
      setSavedSessionId(link.sessionId);
      setStatus(await linkedTrace.status());
      setPhase('exported');
    } catch {
      setError('The trace could not be saved. Keep Trace Lab installed and try again from this screen.');
    } finally { setBusy(false); }
  };

  const openRecorder = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setError('Walking Recorder is not installed on this phone.');
    }
  };

  const title = phase === 'running' ? 'Test running'
    : phase === 'review' ? 'Test finished — save it'
      : phase === 'exported' ? 'Both files are saved'
        : phase === 'expired' ? 'This test expired'
          : 'Linked walking test';

  return (
    <ScreenShell orangeBackground={false} contentStyle={s.content}>
      <Heading title={title} support="Research build · everything stays on this phone · two-hour limit" />

      <StatusCard
        title={phase === 'running' ? 'Trace Lab is recording in the background'
          : phase === 'review' ? 'Walking Recorder finished the ground truth'
            : phase === 'exported' ? 'Saved on this phone'
              : phase === 'expired' ? 'No longer exportable'
                : 'Not recording yet'}
        subtitle={phase === 'exported' && savedSessionId ? `Test ${savedSessionId.slice(0, 8)}…` : NOTHING_COLLECTED}
        nextChange={phase === 'running' ? 'The two-hour limit ends this test automatically.'
          : phase === 'review' ? 'The trace stays on this phone until you delete it.'
            : phase === 'expired' ? 'Deleting it starts the next test clean.'
              : 'Nothing is uploaded; you choose when to share the two files.'}
        unlocked={phase !== 'running'}
      />

      {phase === 'ready' ? (
        <View style={s.section}>
          <Label variant="section">How the test works</Label>
          <Step n={1} text="Tap Start test. Trace Lab begins the background trace and opens Walking Recorder." />
          <Step n={2} text="Walk as usual in Walking Recorder. Tap what you are doing, then answer the canary check when the app asks." />
          <Step n={3} text="Tap Finish test in Walking Recorder. Trace Lab opens again so you can save the trace." />
          <Label tone="secondary">The two apps stay separate: Walking Recorder keeps the honest foreground labels, Trace Lab records what ExcerLock does in the background. Only this phone holds the data.</Label>

          <Label variant="section">Ready to start</Label>
          {step ? (
            <>
              <Label>{step.title}</Label>
              <Label tone="secondary">{step.detail}</Label>
              {step.action ? (
                <PrimaryButton
                  label={busy ? 'Waiting…' : step.action.label}
                  disabled={busy}
                  onPress={() => {
                    const action = step.action;
                    if (!action) return;
                    if (action.kind === 'sign-in') router.push('/sign-in');
                    else void run(action.run, action.failure);
                  }}
                />
              ) : null}
            </>
          ) : (
            <Label>Everything is ready: Screen Time, canary app, Motion &amp; Fitness, and the isolated lab storage.</Label>
          )}
          <PrimaryButton label={busy ? 'Starting…' : 'Start test'} disabled={!preflight || !!step || busy} onPress={() => void start()} />
          {note ? <Label tone="secondary">{note}</Label> : null}
        </View>
      ) : null}

      {phase === 'running' ? (
        <View style={s.section}>
          <Label variant="section">Recording on this phone</Label>
          <Label tone="secondary">
            Trace Lab is in the background, exactly like ExcerLock during a normal walk. Walking Recorder is the only place that
            labels what you are doing and what you saw; nothing is typed here.
          </Label>
          <PrimaryButton
            label="Open Walking Recorder"
            disabled={busy}
            onPress={() => void openRecorder(activeLink ? walkingRecorderSessionLink(activeLink) : walkingRecorderAppLink())}
          />
          <Label tone="secondary">
            If Trace Lab was closed, open Walking Recorder from the Home Screen and tap Finish test there. Its recovery card brings this screen back.
          </Label>
        </View>
      ) : null}

      {phase === 'review' ? (
        <View style={s.section}>
          <Label variant="section">Save the trace</Label>
          <Label tone="secondary">
            Walking Recorder saved its own archive. Trace Lab now needs the one-time link back from Walking Recorder to write its trace
            file; that link reached this screen, so the test can be saved.
          </Label>
          <PrimaryButton label={busy ? 'Saving…' : 'Save trace file'} disabled={busy} onPress={() => void saveTrace()} />
        </View>
      ) : null}

      {phase === 'exported' ? (
        <View style={s.section}>
          <Label variant="section">Your two files</Label>
          <Label>1. Trace file — saved on this phone, ready to share.</Label>
          <SecondaryButton label="Share trace file" onPress={() => void (exportUri ? Sharing.shareAsync(exportUri, { mimeType: 'application/x-ndjson' }) : undefined)} disabled={!exportUri} />
          <Label>2. Walking Recorder archive — saved in Walking Recorder.</Label>
          <PrimaryButton
            label="Share Walking Recorder archive"
            onPress={() => void openRecorder(savedSessionId ? walkingRecorderArchiveLink(savedSessionId) : walkingRecorderAppLink())}
          />
          <Label tone="secondary">
            Both files stay on the phone: share them now or later after the phone is back on a computer. Nothing was uploaded.
          </Label>
          <SecondaryButton
            label="Delete this test from Trace Lab"
            onPress={() => void linkedTrace.deleteSession(savedSessionId ?? '')
              .then(() => { setExportUri(null); setSavedSessionId(null); setPhase('ready'); setNote('The local trace was deleted.'); })
              .catch(() => setError('The local trace could not be deleted.'))}
          />
        </View>
      ) : null}

      {phase === 'expired' ? (
        <View style={s.section}>
          <Label variant="section">Two-hour limit reached</Label>
          <Label tone="secondary">
            The one-time link is gone, so this expired trace can no longer be finalized or exported. Deleting it removes the local
            files and lets you start a clean test; the Walking Recorder archive is untouched.
          </Label>
          <PrimaryButton
            label={busy ? 'Deleting…' : 'Delete expired test'}
            disabled={busy}
            onPress={() => void run(
              () => linkedTrace.abandonExpiredSession(status?.sessionId ?? ''),
              'The expired trace could not be deleted. Nothing was changed.',
            ).then((cleaned) => {
              if (!cleaned) return;
              setStatus({ active: false, sessionId: null, expiresAtWallTimeMs: null, truncated: false });
              setPhase('ready');
            })}
          />
          {handshake && handshake.sessionId !== status?.sessionId ? (
            <Label tone="secondary">A newer test link is open: after this cleanup, tap Start test for that new test.</Label>
          ) : null}
        </View>
      ) : null}

      {error ? <Label accessibilityRole="alert" style={s.error}>{error}</Label> : null}
      <Label tone="secondary" variant="support">
        Protocol {LINK_PROTOCOL_VERSION} · “returned” means the Managed Settings call came back; it does not prove a shield was visible.
      </Label>
    </ScreenShell>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={s.step}>
      <Label variant="section">{n}</Label>
      <Label style={s.stepText}>{text}</Label>
    </View>
  );
}

type Readiness = {
  title: string;
  detail: string;
  action?: { kind: 'prompt'; label: string; failure: string; run: () => Promise<unknown> } | { kind: 'sign-in'; label: string };
};

/** The single next thing standing between the operator and a real test. */
export function readinessStep({
  entitlementStatus,
  preflight,
  labAccess,
  runtime,
}: {
  entitlementStatus: string;
  preflight: LinkedTracePreflight | null;
  labAccess: boolean;
  runtime: ReturnType<typeof useRuntime>;
}): Readiness | null {
  if (!preflight) return { title: 'Checking this phone…', detail: 'Reading the local Screen Time, motion, and lab storage state.' };
  if (!preflight.labStorageIsolated) {
    return {
      title: 'This build has no isolated lab storage',
      detail: 'Trace Lab must be a signed research build with its own lab App Group. This build cannot record a test.',
    };
  }
  if (!labAccess) {
    return {
      title: 'Sign in once with your lab account',
      detail: `Trace Lab records the real shield path, which only runs for an existing trial or active development account (this phone reports “${entitlementStatus}”). It never grants or invents access.`,
      action: { kind: 'sign-in', label: 'Sign in' },
    };
  }
  if (!preflight.screenTimeAuthorized) {
    return {
      title: 'Allow Screen Time',
      detail: 'Screen Time is the only way iOS lets Trace Lab record the real background lock. iOS asks, so only the system prompt can grant it.',
      action: { kind: 'prompt', label: 'Allow Screen Time', failure: 'Screen Time was not allowed. Your existing choices were kept.', run: () => runtime.screenTime.requestAuthorization() },
    };
  }
  if (!preflight.canarySelectionValid) {
    return {
      title: preflight.canaryIncludesTestApps ? 'Pick a different canary app' : 'Choose one canary app',
      detail: preflight.canaryIncludesTestApps
        ? 'Walking Recorder and Trace Lab can never be the app you try to open while walking. Pick one harmless app you can open during the walk.'
        : 'The canary is the harmless app you will try to open while walking; it is the app the shield may block. Choose exactly one app, with no categories or websites, and never Walking Recorder or Trace Lab.',
      action: { kind: 'prompt', label: 'Choose canary app', failure: 'The canary app was not changed.', run: () => runtime.screenTime.presentAppPicker() },
    };
  }
  if (!preflight.motionReady) {
    return {
      title: 'Allow Motion & Fitness',
      detail: 'Trace Lab records its own motion evidence for the background detector. Walking Recorder asks for the same permission separately when it starts.',
      action: { kind: 'prompt', label: 'Allow Motion & Fitness', failure: 'Motion & Fitness was not allowed. No test was started.', run: () => runtime.steps.request() },
    };
  }
  return null;
}

const s = StyleSheet.create({
  content: { gap: t.space.xl, paddingBottom: t.space.xxxl },
  section: { gap: t.space.lg },
  step: { flexDirection: 'row', gap: t.space.lg, alignItems: 'flex-start' },
  stepText: { flex: 1 },
  error: { color: t.state.error },
});
