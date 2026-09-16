import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Linking, Pressable, StyleSheet, View } from 'react-native';

import {
  linkedTrace,
  type LinkedTraceFinalizedSession,
  type LinkedTracePreflight,
  type LinkedTraceStatus,
} from '@linked-trace';
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
import { NATIVE_LOCKED_SELECTION } from '../../screentime/native/nativeSelection';
import { rulesStore } from '../../state/rulesStore';
import { clearActiveHandshake, loadActiveHandshake, saveActiveHandshake } from './linkedHandshakeStore.research';
import { ensureLabWalkingRule, removeLabWalkingRule } from './labWalkingRule.research';

type Phase = 'ready' | 'running' | 'review' | 'exported' | 'expired';

const NOTHING_COLLECTED = 'No GPS, microphone, camera, raw vectors, or Health history is collected.';
const ALREADY_SAVED = 'That test was already saved on this phone, so there is nothing left to finalize.';
const SAVED_NOTE = 'The trace is saved on this phone. Share it now, or reconnect later — nothing was uploaded.';
const RETURNED_NOT_SAVED = 'That test link is not an active or saved test on this phone, so there was nothing to finalize. Start test begins a clean run.';

/**
 * The one guided research path: start here, record the ground truth in Walking
 * Recorder, finish there, then save and share both files here. Everything runs
 * and stays on this phone; a Mac is never needed while a test runs, and a
 * finished trace can still be shared after a relaunch.
 */
export function LinkedTraceScreen() {
  const runtime = useRuntime();
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
  const [finalized, setFinalized] = useState<LinkedTraceFinalizedSession[]>([]);
  const [startedLink, setStartedLink] = useState<LinkedHandshake | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // Only a link that Walking Recorder actually sent back means the ground truth
  // is finished. The link this screen mints for a new test is never evidence of
  // a return, so a fresh running test can never settle into "save it".
  const returnedLinkRef = useRef<LinkedHandshake | null>(null);

  // A test that survives a Trace Lab relaunch has no in-memory handshake left,
  // so the persisted lab copy is the only way to reopen the intended Walking
  // Recorder session. Loading it never marks a test finished.
  const hydrateActiveLink = useCallback(async (current: LinkedTraceStatus) => {
    if (!current.sessionId || !current.active) {
      await clearActiveHandshake();
      return;
    }
    const stored = await loadActiveHandshake(current.sessionId);
    if (stored) setStartedLink((existing) => existing ?? stored);
  }, []);

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
  const settle = useCallback((
    current: LinkedTraceStatus,
    returned: LinkedHandshake | null,
    saved: LinkedTraceFinalizedSession[],
  ) => {
    if (current.sessionId && current.active) {
      setPhase(returned?.sessionId === current.sessionId ? 'review' : 'running');
      return;
    }
    if (current.sessionId) {
      setPhase('expired');
      return;
    }
    // Only a returned test that is actually in the saved list was saved. A
    // deleted, abandoned, or already-cleaned session gets truthful recovery
    // wording instead of a false "already saved" claim.
    const returnedIsSaved = returned !== null && saved.some((session) => session.sessionId === returned.sessionId);
    if (saved.length) {
      setPhase('exported');
      if (returnedIsSaved) setNote(ALREADY_SAVED);
      else if (returned) setNote(RETURNED_NOT_SAVED);
      return;
    }
    if (returned) setNote(RETURNED_NOT_SAVED);
    setPhase('ready');
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([linkedTrace.status(), linkedTrace.preflight(), linkedTrace.finalized()])
      .then(([current, readiness, saved]) => {
        if (cancelled) return;
        setStatus(current);
        setPreflight(readiness);
        setFinalized(saved);
        settle(current, returnedLinkRef.current, saved);
        void hydrateActiveLink(current);
      })
      .catch(() => {
        if (!cancelled) setError('The local readiness check could not run. Reopen Trace Lab and try again.');
      });
    return () => { cancelled = true; };
  }, [settle, hydrateActiveLink]);

  // Walking Recorder returns here with the one-time link when a test is done.
  useEffect(() => {
    if (!handshake) return;
    returnedLinkRef.current = handshake;
    let cancelled = false;
    void Promise.all([linkedTrace.status(), linkedTrace.finalized()])
      .then(([current, saved]) => {
        if (cancelled) return;
        setStatus(current);
        setFinalized(saved);
        settle(current, handshake, saved);
      })
      .catch(() => { if (!cancelled) setError('Trace Lab could not read the local trace. Try again.'); });
    return () => { cancelled = true; };
  }, [handshake, settle]);

  // The lab walking rule is part of the running test, not a setup step: it is
  // installed with the trace and removed as soon as no trace is running, so the
  // canary shows ExcerLock's real block/release behavior only during a test.
  useEffect(() => {
    if (!status) return;
    if (status.sessionId && status.active) ensureLabWalkingRule();
    else removeLabWalkingRule();
  }, [status]);

  // A running test must notice its own two-hour expiry and the return to
  // foreground. Neither check can turn a running test into "save it"; that only
  // happens when the recorder's own return link arrives above.
  useEffect(() => {
    if (phase !== 'running') return;
    const sync = () => {
      void Promise.all([linkedTrace.status(), linkedTrace.finalized()])
        .then(([current, saved]) => {
          setStatus(current);
          setFinalized(saved);
          settle(current, returnedLinkRef.current, saved);
          void hydrateActiveLink(current);
        })
        .catch(() => undefined);
    };
    const interval = setInterval(sync, 10_000);
    const subscription = AppState.addEventListener('change', (next) => { if (next === 'active') sync(); });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [phase, settle, hydrateActiveLink]);

  const labAccess = entitlementStatus === 'active' || entitlementStatus === 'trial';
  const step = readinessStep({ entitlementStatus, preflight, labAccess, runtime });

  // A system permission sheet takes the app inactive and can settle after the
  // request call has already returned. The return to active is the moment the
  // readiness step and its failure line can be re-read from the phone itself.
  useEffect(() => {
    if (phase !== 'ready' && phase !== 'exported') return;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      void refreshPreflight().then((latest) => {
        if (latest && !readinessStep({ entitlementStatus, preflight: latest, labAccess, runtime })) setError(null);
      });
    });
    return () => subscription.remove();
  }, [phase, refreshPreflight, entitlementStatus, labAccess, runtime]);

  const run = async (operation: () => Promise<unknown>, message: string): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    setError(null);
    let failed = false;
    try {
      await operation();
      return true;
    } catch {
      failed = true;
      setError(message);
      return false;
    } finally {
      const latest = await refreshPreflight();
      // A system prompt can resolve after the request call already rejected;
      // the refreshed preflight, not the rejection, says whether the step is
      // still missing.
      if (failed && latest && readinessStep({ entitlementStatus, preflight: latest, labAccess, runtime })?.action?.failure !== message) {
        setError(null);
      }
      setBusy(false);
    }
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
      // Native preflight is the source of truth for the FamilyControls tokens.
      // JS lockedApps can still be empty after a picker/reconcile race; without
      // this handle, enforcement publishes an open "disabled" policy and the
      // canary is never shielded.
      if (latest.canarySelectionValid) {
        rulesStore.getState().patch({
          lockedApps: { handle: { token: NATIVE_LOCKED_SELECTION }, isEmpty: false },
        });
      }
      // Every start mints a fresh phone-local session id, so the native writer's
      // durable collision refusal can only be reached by a repeated delivery of
      // a link this screen never minted twice.
      const link = newLinkedSession();
      // Readiness guarantee: the real ExcerLock walking rule is in place before
      // the trace starts, so the canary can produce block/release evidence. The
      // status effect removes it as soon as no trace is running.
      ensureLabWalkingRule();
      const active = await linkedTrace.start(link.sessionId, link.nonce);
      setStartedLink(link);
      setStatus(active);
      setPhase('running');
      try {
        // Best effort: a test that is already recording must keep going even if
        // the lab-local recovery copy cannot be written.
        await saveActiveHandshake(link);
      } catch {
        // Recovery after a relaunch is the only thing this costs.
      }
      try {
        await Linking.openURL(walkingRecorderSessionLink(link));
      } catch {
        setError('The trace is running, but Walking Recorder could not be opened. Open Walking Recorder from the Home Screen to record this test.');
      }
    } catch {
      const current = await linkedTrace.status().catch(() => null);
      if (!current?.active) removeLabWalkingRule();
      setError('The trace did not start. Nothing was recorded; try again.');
    } finally { setBusy(false); }
  };

  const saveTrace = async () => {
    const link = startedLink ?? returnedLinkRef.current;
    if (!link || busy) return;
    setBusy(true);
    setError(null);
    try {
      await linkedTrace.stop(link.sessionId, link.nonce);
      returnedLinkRef.current = null;
      setStartedLink(null);
      await clearActiveHandshake();
      const [current, saved] = await Promise.all([linkedTrace.status(), linkedTrace.finalized()]);
      setStatus(current);
      setFinalized(saved);
      if (current.sessionId && !current.active) {
        // The native writer refuses to finalize a trace past its two-hour TTL,
        // so a review screen that outlived the limit resettles to expired.
        setPhase('expired');
        setNote(null);
        return;
      }
      setPhase('exported');
      setNote(SAVED_NOTE);
    } catch {
      const current = await linkedTrace.status().catch(() => null);
      if (current?.sessionId && !current.active) {
        setStatus(current);
        setFinalized(await linkedTrace.finalized().catch(() => []));
        setPhase('expired');
        setNote(null);
        return;
      }
      setError('The trace could not be saved. Keep Trace Lab installed and try again from this screen.');
    } finally { setBusy(false); }
  };

  const shareTrace = async (sessionId: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      // The durable copy lives in the lab App Group, so this still works after
      // a relaunch or after iOS purged the temporary export file.
      const uri = await linkedTrace.exportSession(sessionId);
      await Sharing.shareAsync(uri, { mimeType: 'application/x-ndjson' });
    } catch {
      setError('The trace file could not be shared. Reopen Trace Lab to refresh the saved list, then try again.');
      void linkedTrace.finalized().then(setFinalized).catch(() => undefined);
    } finally { setBusy(false); }
  };

  const openRecorder = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setError('Walking Recorder is not installed on this phone.');
    }
  };

  const deleteSaved = async (sessionId: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await linkedTrace.deleteSession(sessionId);
      const current = await linkedTrace.status();
      setStatus(current);
      if (!current.active) removeLabWalkingRule();
      const saved = await linkedTrace.finalized();
      setFinalized(saved);
      setNote('The local trace was deleted.');
      if (!saved.length) setPhase('ready');
    } catch {
      setError('The local trace could not be deleted. Nothing was changed.');
    } finally { setBusy(false); }
  };

  const confirmDeleteSaved = (sessionId: string) => {
    Alert.alert(
      'Delete this trace from Trace Lab?',
      'This removes the local trace file from this phone. The Walking Recorder archive is separate and is not touched.',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void deleteSaved(sessionId) },
      ],
    );
  };

  const discardExpired = async () => {
    const expiredId = status?.sessionId ?? '';
    const cleaned = await run(
      () => linkedTrace.abandonExpiredSession(expiredId),
      'The expired trace could not be deleted. Nothing was changed.',
    );
    if (!cleaned) return;
    removeLabWalkingRule();
    await clearActiveHandshake();
    setStatus(await linkedTrace.status());
    const saved = await linkedTrace.finalized();
    setFinalized(saved);
    setPhase(saved.length ? 'exported' : 'ready');
    setNote('The expired test was cleared. Start test begins a clean run.');
  };

  // The bounded escape for a test whose Walking Recorder never started (for
  // example the hand-off link could not open) or cannot be finished. It is a
  // quiet, confirmed action beside the primary hand-off, never the main path.
  const cancelActive = async () => {
    const sessionId = status?.sessionId;
    if (!sessionId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await linkedTrace.cancelActiveSession(sessionId);
      returnedLinkRef.current = null;
      setStartedLink(null);
      await clearActiveHandshake();
      removeLabWalkingRule();
      const [current, saved] = await Promise.all([linkedTrace.status(), linkedTrace.finalized()]);
      setStatus(current);
      setFinalized(saved);
      setPhase(saved.length ? 'exported' : 'ready');
      setNote('The test was cancelled and its unfinished trace was removed from this phone. Nothing was saved or exported.');
    } catch {
      // A save that began before an interruption is finished as saved, so a
      // later cancel is refused. Re-read the phone's own state and land on the
      // truthful step instead of claiming the test may still be running.
      const [current, saved] = await Promise.all([
        linkedTrace.status().catch(() => null),
        linkedTrace.finalized().catch(() => []),
      ]);
      if (!current || current.active) {
        setError('The test could not be cancelled, so it may still be running. Try again from this screen.');
        return;
      }
      removeLabWalkingRule();
      await clearActiveHandshake().catch(() => undefined);
      setStartedLink(null);
      setStatus(current);
      setFinalized(saved);
      settle(current, returnedLinkRef.current, saved);
      if (saved.some((session) => session.sessionId === sessionId)) {
        setNote(ALREADY_SAVED);
      } else {
        setNote('That test is no longer active on this phone, so there was nothing left to cancel.');
      }
    } finally { setBusy(false); }
  };

  const confirmCancelActive = () => {
    Alert.alert(
      'Cancel this test?',
      'This stops the background trace and records the test as abandoned instead of saved. Nothing is exported, and Walking Recorder keeps its own archive.',
      [
        { text: 'Keep test', style: 'cancel' },
        { text: 'Cancel test', style: 'destructive', onPress: () => void cancelActive() },
      ],
    );
  };

  const title = phase === 'running' ? 'Test running'
    : phase === 'review' ? 'Test finished — save it'
      : phase === 'expired' ? 'This test expired'
        : 'Linked walking test';
  const showStartSection = phase === 'ready' || phase === 'exported';
  const showSavedSection = finalized.length > 0 && phase !== 'running' && phase !== 'review' && phase !== 'expired';

  return (
    <ScreenShell orangeBackground={false} contentStyle={s.content}>
      <Heading title={title} support="Research build · everything stays on this phone · two-hour limit" />

      <StatusCard
        title={phase === 'running' ? 'Trace Lab is recording in the background'
          : phase === 'review' ? 'Walking Recorder finished the ground truth'
            : phase === 'expired' ? 'No longer exportable'
              : finalized.length ? 'Saved on this phone'
                : 'Not recording yet'}
        subtitle={finalized.length && phase !== 'running' && phase !== 'review' && phase !== 'expired'
          ? `${finalized.length} saved test${finalized.length === 1 ? '' : 's'} on this phone`
          : NOTHING_COLLECTED}
        nextChange={phase === 'running' ? 'The two-hour limit ends this test automatically.'
          : phase === 'review' ? 'The trace stays on this phone until you delete it.'
            : phase === 'expired' ? 'Clearing it starts the next test clean.'
              : 'Nothing is uploaded; you choose when to share the two files.'}
        unlocked={phase !== 'running'}
      />

      {showStartSection ? (
        <View style={s.section}>
          <Label variant="section">How the test works</Label>
          <Step n={1} text="Tap Start test. Trace Lab begins the background trace and opens Walking Recorder." />
          <Step n={2} text="Walk as usual in Walking Recorder and tap what you are doing. Answer the canary check inline: your canary app opens while you walk, and it is blocked again after you stand still past the stop grace." />
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
                    void run(action.run, action.failure);
                  }}
                />
              ) : null}
            </>
          ) : (
            <Label>Everything is ready: Screen Time, canary app, Motion &amp; Fitness, Always location, and the isolated lab storage.</Label>
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
            onPress={() => void openRecorder(startedLink ? walkingRecorderSessionLink(startedLink) : walkingRecorderAppLink())}
          />
          <Label tone="secondary">
            If you left Trace Lab, open Walking Recorder from the Home Screen. Still recording? Tap Finish test there. Already
            finished? Tap Open Trace Lab on its “Linked test recorded here” card. Either way this screen comes back so you can save
            the trace.
          </Label>
          <Label tone="secondary">
            If Walking Recorder never started this test, or it cannot be finished, cancel it below and start clean. Cancelling saves nothing.
          </Label>
          <SubordinateButton label={busy ? 'Cancelling…' : 'Cancel test'} disabled={busy} onPress={confirmCancelActive} />
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

      {showSavedSection ? (
        <View style={s.section}>
          <Label variant="section">Saved tests on this phone</Label>
          <Label tone="secondary">
            Each saved test keeps both local files: the Trace Lab trace and the Walking Recorder archive. Share them now, or later
            after this phone is back on a computer. Nothing was uploaded.
          </Label>
          {finalized.map((session, index) => {
            const newest = index === 0;
            return (
              <View key={session.sessionId} style={s.savedCard}>
                <Label>{newest ? 'Latest test' : 'Earlier test'} {session.sessionId.slice(0, 8)}…</Label>
                <Label tone="secondary" variant="support">
                  {formatBytes(session.byteCount)} · finished {formatWhen(session.finalizedAtWallTimeMs)}
                </Label>
                {newest ? (
                  <PrimaryButton
                    label={busy ? 'Preparing…' : 'Share trace file'}
                    disabled={busy}
                    onPress={() => void shareTrace(session.sessionId)}
                  />
                ) : (
                  <SecondaryButton
                    label={busy ? 'Preparing…' : 'Share trace file'}
                    disabled={busy}
                    onPress={() => void shareTrace(session.sessionId)}
                  />
                )}
                <SecondaryButton
                  label="Share Walking Recorder archive"
                  disabled={busy}
                  onPress={() => void openRecorder(walkingRecorderArchiveLink(session.sessionId))}
                />
                <SubordinateButton
                  label="Delete this trace from Trace Lab"
                  disabled={busy}
                  onPress={() => confirmDeleteSaved(session.sessionId)}
                />
              </View>
            );
          })}
        </View>
      ) : null}

      {phase === 'expired' ? (
        <View style={s.section}>
          <Label variant="section">Two-hour limit reached</Label>
          <Label tone="secondary">
            The one-time link is gone, so this expired trace can no longer be finalized or exported. Clearing it removes the recorded
            trace from this phone and lets you start a clean test; the Walking Recorder archive is untouched.
          </Label>
          <PrimaryButton
            label={busy ? 'Deleting…' : 'Delete expired test'}
            disabled={busy}
            onPress={() => void discardExpired()}
          />
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

/** A deliberately quiet text action for the one destructive choice on the screen. */
function SubordinateButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={s.subordinate}
    >
      <Label tone="secondary" style={s.subordinateText}>{label}</Label>
    </Pressable>
  );
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Trace file saved';
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${(bytes / 1_024).toFixed(1)} KB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(1)} MB`;
}

function formatWhen(wallTimeMs: number): string {
  const date = new Date(wallTimeMs);
  if (Number.isNaN(date.getTime())) return 'earlier';
  return date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

type Readiness = {
  title: string;
  detail: string;
  action?: { label: string; failure: string; run: () => Promise<unknown> };
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
    // The standalone lab carries its own local research identity and
    // entitlement; it never signs in to a production account. A missing local
    // entitlement means the lab graph did not finish starting, not that the
    // operator must authenticate.
    return {
      title: 'The isolated lab identity did not start',
      detail: `Trace Lab runs entirely on a lab-local identity and entitlement. Open Trace Lab again before starting the test; production sign-in is not part of this research build (this phone reports “${entitlementStatus}”).`,
    };
  }
  if (!preflight.screenTimeAuthorized) {
    return {
      title: 'Allow Screen Time',
      detail: 'Screen Time is the only way iOS lets Trace Lab record the real background lock. iOS asks, so only the system prompt can grant it.',
      action: { label: 'Allow Screen Time', failure: 'Screen Time was not allowed. Your existing choices were kept.', run: () => runtime.screenTime.requestAuthorization() },
    };
  }
  if (!preflight.canarySelectionValid) {
    return {
      title: 'Choose one canary app',
      detail: `Pick exactly one app with no categories or websites: the harmless app you will try to open while walking and again after standing still, so the shield can show its real release and return. Never pick Walking Recorder or ExcerLock Trace Lab. iOS does not tell Trace Lab which app you chose, so this one choice is yours (it currently holds ${preflight.canaryApplicationCount} app, ${preflight.canaryCategoryCount} categories, ${preflight.canaryWebDomainCount} websites).`,
      action: { label: 'Choose canary app', failure: 'The canary app was not changed.', run: () => runtime.screenTime.presentAppPicker() },
    };
  }
  if (!preflight.motionReady) {
    return {
      title: 'Allow Motion & Fitness',
      detail: 'Trace Lab records its own motion evidence for the background detector. Walking Recorder asks for the same permission separately when it starts.',
      action: { label: 'Allow Motion & Fitness', failure: 'Motion & Fitness was not allowed. No test was started.', run: () => runtime.steps.request() },
    };
  }
  if (!preflight.locationAlwaysAuthorized) {
    return {
      title: 'Allow Location (Always)',
      detail: 'ExcerLock stays awake in the background through its location keep-alive, and iOS only runs that under Always. Without it Trace Lab is suspended as soon as Walking Recorder is in front and records nothing. Choose Always (Allow While Using first, then Change to Always Allow). No location is written to the trace.',
      action: { label: 'Allow Location (Always)', failure: 'Location was not set to Always. No test was started.', run: () => runtime.gym.requestBackgroundLocation() },
    };
  }
  return null;
}

const s = StyleSheet.create({
  content: { gap: t.space.xl, paddingBottom: t.space.xxxl },
  section: { gap: t.space.lg },
  step: { flexDirection: 'row', gap: t.space.lg, alignItems: 'flex-start' },
  stepText: { flex: 1 },
  savedCard: { gap: t.space.md, padding: t.space.lg, borderWidth: 1, borderColor: t.border.outline, borderRadius: t.radius.card, backgroundColor: t.surface.card },
  subordinate: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  subordinateText: { textDecorationLine: 'underline' },
  error: { color: t.state.error },
});
