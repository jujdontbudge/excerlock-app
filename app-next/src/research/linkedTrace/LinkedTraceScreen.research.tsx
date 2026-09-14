import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { linkedTrace, type LinkedTracePreflight, type LinkedTraceStatus } from '@linked-trace';
import {
  ChoiceRow,
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

type Phase = 'idle' | 'active' | 'expired' | 'exported' | 'deleted';

function first(value: string | string[] | undefined): string { return Array.isArray(value) ? value[0] ?? '' : value ?? ''; }

export function LinkedTraceScreen() {
  const runtime = useRuntime();
  const entitlementStatus = useEntitlementStore((state) => state.data.entitlement.status);
  const params = useLocalSearchParams<{ sessionId?: string | string[]; nonce?: string | string[]; protocolVersion?: string | string[] }>();
  const sessionId = first(params.sessionId).toLowerCase();
  const nonce = first(params.nonce);
  const protocolVersion = first(params.protocolVersion);
  const validHandshake = sessionId !== '' && nonce !== '' && protocolVersion === '1';
  const [consented, setConsented] = useState(false);
  const [canaryConfirmed, setCanaryConfirmed] = useState(false);
  const [abandonConfirmed, setAbandonConfirmed] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState<LinkedTraceStatus | null>(null);
  const [preflight, setPreflight] = useState<LinkedTracePreflight | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportUri, setExportUri] = useState<string | null>(null);

  const refreshPreflight = async () => {
    try {
      const current = await linkedTrace.preflight();
      setPreflight(current);
      return current;
    } catch {
      setError('Preflight could not read the local requirements. Reopen Trace Lab and try again.');
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;
    void Promise.all([linkedTrace.status(), linkedTrace.preflight()])
      .then(([current, readiness]) => {
        if (cancelled) return;
        setStatus(current);
        setPreflight(readiness);
        if (current.sessionId === sessionId && validHandshake) setPhase('active');
        else if (current.sessionId && current.active === false) setPhase('expired');
      })
      .catch(() => {
        if (!cancelled) setError('Preflight could not read the local requirements. Reopen Trace Lab and try again.');
      });
    return () => { cancelled = true; };
  }, [sessionId, validHandshake]);

  useEffect(() => {
    if (phase !== 'active') return;
    const interval = setInterval(() => { void linkedTrace.status().then(setStatus); }, 15_000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'active') return;
    let previous = AppState.currentState;
    const subscription = AppState.addEventListener('change', (next) => {
      linkedTrace.record('app_lifecycle', { layer: 'js', state: next, previous });
      previous = next;
    });
    return () => subscription.remove();
  }, [phase]);

  const missingStep = useMemo(() => {
    if (!preflight) return 'Wait for the local preflight check.';
    if (!preflight.labStorageIsolated) return 'Use a signed Trace Lab build with its isolated lab App Group entitlement.';
    if (entitlementStatus !== 'active' && entitlementStatus !== 'trial') return 'Sign in to the development environment with existing lab access.';
    if (!preflight.screenTimeAuthorized) return 'Allow Screen Time in Trace Lab setup.';
    if (!preflight.canarySelectionValid) return 'Select exactly one harmless canary app, with no category or website selection.';
    if (!canaryConfirmed) return 'Confirm the canary is harmless and is not Walking Recorder.';
    if (!preflight.motionReady) return 'Allow Motion & Fitness and confirm required motion services are available.';
    return null;
  }, [canaryConfirmed, entitlementStatus, preflight]);
  const preflightReady = missingStep === null;

  const completePrerequisite = async (operation: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await operation();
      await refreshPreflight();
    } catch {
      setError('That prerequisite was not completed. Your current system choice was preserved.');
    } finally { setBusy(false); }
  };

  const title = phase === 'active'
    ? 'Trace in progress'
    : phase === 'expired'
      ? 'Expired trace found'
      : phase === 'exported'
        ? 'Trace ready to share'
        : phase === 'deleted'
          ? 'Local trace deleted'
          : validHandshake ? 'Linked background test' : 'Recorder link required';

  const begin = async () => {
    if (!validHandshake || !consented || busy) return;
    setBusy(true);
    setError(null);
    try {
      const latest = await refreshPreflight();
      if (!latest?.labStorageIsolated || (entitlementStatus !== 'active' && entitlementStatus !== 'trial') ||
          !latest.screenTimeAuthorized || !latest.motionReady || !latest.canarySelectionValid || !canaryConfirmed) {
        setError('The trace did not start. Complete the named preflight step first.');
        return;
      }
      const active = await linkedTrace.start(sessionId, nonce);
      setStatus(active);
      setPhase('active');
    } catch (cause) {
      setError(String(cause).includes('sessionExists')
        ? 'This session was already finalized on this phone; its trace was kept. Start a new linked session from Walking Recorder.'
        : 'The local trace could not start. Reopen this screen from Walking Recorder.');
    } finally { setBusy(false); }
  };

  const stopAndExport = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const uri = await linkedTrace.stop(sessionId, nonce);
      setExportUri(uri);
      setStatus(await linkedTrace.status());
      setPhase('exported');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/x-ndjson' });
    } catch {
      setError('The trace could not be finalized. Keep the app installed and try again.');
    } finally { setBusy(false); }
  };

  const abandonExpired = async () => {
    const expiredSessionId = status?.sessionId;
    if (!expiredSessionId || status.active || !abandonConfirmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await linkedTrace.abandonExpiredSession(expiredSessionId);
      setStatus(await linkedTrace.status());
      setPhase(validHandshake ? 'idle' : 'deleted');
    } catch {
      setError('The expired trace could not be abandoned. No active trace was changed.');
    } finally { setBusy(false); }
  };

  return (
    <ScreenShell orangeBackground={false} contentStyle={s.content}>
      <Heading title={title} support="Research-only build · local export · two-hour session limit" />
      <StatusCard
        title={phase === 'active'
          ? status?.active === false ? 'Two-hour recording limit reached' : 'Local diagnostic recording active'
          : phase === 'expired' ? 'Expired local trace is blocking a clean start'
            : phase === 'exported' ? 'Recording stopped' : phase === 'deleted' ? 'Files removed' : 'Not recording'}
        subtitle={validHandshake ? `Session ${sessionId.slice(0, 8)}…` : 'Open the one-time link from Walking Recorder.'}
        nextChange={status?.truncated ? 'Trace reached its size limit.' : 'No GPS, microphone, camera, raw vectors, or Health history is collected.'}
        unlocked={phase !== 'active'}
      />

      {phase === 'idle' ? (
        <View style={s.section}>
          <Label variant="section">Preflight</Label>
          <Label tone="secondary">Trace Lab checks real local prerequisites before it can record. Access must come from the development environment; this screen never grants or overrides it.</Label>
          <PreflightRow label="Isolated lab App Group entitlement" ready={preflight?.labStorageIsolated === true} />
          <PreflightRow label="Existing development access" ready={entitlementStatus === 'active' || entitlementStatus === 'trial'} />
          <PreflightRow label="Screen Time authorized" ready={preflight?.screenTimeAuthorized === true} />
          {preflight?.screenTimeAuthorized === false ? (
            <SecondaryButton label="Allow Screen Time" onPress={() => void completePrerequisite(() => runtime.screenTime.requestAuthorization())} />
          ) : null}
          <PreflightRow label="Exactly one app selected as canary" ready={preflight?.canarySelectionValid === true} />
          {preflight?.screenTimeAuthorized === true && preflight.canarySelectionValid === false ? (
            <SecondaryButton label="Select one canary app" onPress={() => void completePrerequisite(() => runtime.screenTime.presentAppPicker())} />
          ) : null}
          <PreflightRow label="Motion & Fitness ready" ready={preflight?.motionReady === true} />
          {preflight?.motionReady === false ? (
            <SecondaryButton label="Allow Motion & Fitness" onPress={() => void completePrerequisite(() => runtime.steps.request())} />
          ) : null}
          <ChoiceRow
            title="My selected app is a harmless canary"
            support="Walking Recorder is not selected. Categories and websites are not selected."
            selected={canaryConfirmed}
            multiple
            onPress={() => setCanaryConfirmed((value) => !value)}
          />
          <SecondaryButton label="Refresh preflight" onPress={() => void refreshPreflight()} />
          {missingStep ? <Label accessibilityRole="alert">Next: {missingStep}</Label> : null}

          <Label variant="section">Consent</Label>
          <Label tone="secondary">
            This records local motion callback receipts, detector transitions, policy and watchdog operations, extension callbacks,
            and shield-write return values. Visible canary outcomes and all human labels stay in Walking Recorder.
          </Label>
          <ChoiceRow
            title="I consent to this local research trace"
            support="Nothing is uploaded automatically. You choose whether to share the exported files."
            selected={consented}
            multiple
            onPress={() => setConsented((value) => !value)}
          />
          <PrimaryButton label={busy ? 'Starting…' : 'Start linked trace'} disabled={!validHandshake || !consented || !preflightReady || busy} onPress={() => void begin()} />
        </View>
      ) : null}

      {phase === 'active' ? (
        <View style={s.section}>
          <Label variant="section">Continue in Walking Recorder</Label>
          <Label tone="secondary">
            Walking Recorder owns test phases and visible canary outcomes. Return here only to finalize and export this separate production-path trace.
          </Label>
          <PrimaryButton label={busy ? 'Finalizing…' : status?.active === false ? 'Finalize expired trace' : 'End trace and export'} disabled={busy} onPress={() => void stopAndExport()} />
        </View>
      ) : null}

      {phase === 'expired' && status?.sessionId ? (
        <View style={s.section}>
          <Label variant="section">Explicit local cleanup</Label>
          <Label tone="secondary">
            The two-hour limit has passed and the one-time Recorder link is unavailable. Abandon deletes this expired local trace without exporting it. An unexpired trace can never use this path.
          </Label>
          <ChoiceRow
            title="I understand this expired trace will be deleted"
            selected={abandonConfirmed}
            multiple
            onPress={() => setAbandonConfirmed((value) => !value)}
          />
          <PrimaryButton label={busy ? 'Deleting…' : 'Abandon expired trace'} disabled={!abandonConfirmed || busy} onPress={() => void abandonExpired()} />
        </View>
      ) : null}

      {phase === 'exported' && exportUri ? (
        <View style={s.section}>
          <Label tone="secondary" selectable>{exportUri}</Label>
          <PrimaryButton
            label="Share export again"
            onPress={() => void Sharing.shareAsync(exportUri, { mimeType: 'application/x-ndjson' })}
          />
          <SecondaryButton
            label="Delete local trace"
            onPress={() => void linkedTrace.deleteSession(sessionId).then(() => {
              setExportUri(null);
              setPhase('deleted');
            }).catch(() => setError('The local trace could not be deleted.'))}
          />
        </View>
      ) : null}

      {error ? <Label accessibilityRole="alert" style={s.error}>{error}</Label> : null}
      <Label tone="secondary" variant="support">
        “Returned” means the Managed Settings setter returned and a readback was taken. It does not prove a shield was visible.
      </Label>
    </ScreenShell>
  );
}

function PreflightRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <View style={s.preflightRow} accessibilityLabel={`${label}: ${ready ? 'ready' : 'missing'}`}>
      <Label>{ready ? 'Ready' : 'Missing'}</Label>
      <Label tone="secondary">{label}</Label>
    </View>
  );
}

const s = StyleSheet.create({
  content: { gap: t.space.xl, paddingBottom: t.space.xxxl },
  section: { gap: t.space.lg },
  preflightRow: { gap: t.space.xs },
  error: { color: t.state.error },
});
