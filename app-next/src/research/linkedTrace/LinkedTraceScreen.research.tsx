import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { linkedTrace, type LinkedTraceStatus } from '@linked-trace';
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

type Phase = 'idle' | 'active' | 'exported' | 'deleted';
type CanaryPhase = 'lock' | 'unlock';
type CanaryOutcome = 'shield_visible' | 'app_opened' | 'uncertain';

function first(value: string | string[] | undefined): string { return Array.isArray(value) ? value[0] ?? '' : value ?? ''; }
function validSession(value: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function validNonce(value: string): boolean { return /^[0-9a-f-]{64,160}$/i.test(value); }

export function LinkedTraceScreen() {
  const params = useLocalSearchParams<{ sessionId?: string | string[]; nonce?: string | string[]; protocolVersion?: string | string[] }>();
  const sessionId = first(params.sessionId).toLowerCase();
  const nonce = first(params.nonce);
  const protocolVersion = first(params.protocolVersion);
  const validHandshake = validSession(sessionId) && validNonce(nonce) && protocolVersion === '1';
  const [consented, setConsented] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [status, setStatus] = useState<LinkedTraceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportUri, setExportUri] = useState<string | null>(null);
  const [lockOutcome, setLockOutcome] = useState<CanaryOutcome | null>(null);
  const [unlockOutcome, setUnlockOutcome] = useState<CanaryOutcome | null>(null);

  useEffect(() => {
    if (!validHandshake) return;
    void linkedTrace.status().then((current) => {
      setStatus(current);
      if (current.sessionId === sessionId) setPhase('active');
    });
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

  const title = !validHandshake
    ? 'Recorder link required'
    : phase === 'active'
      ? 'Trace in progress'
      : phase === 'exported'
        ? 'Trace ready to share'
        : phase === 'deleted'
          ? 'Local trace deleted'
          : 'Linked background test';

  const begin = async () => {
    if (!validHandshake || !consented || busy) return;
    setBusy(true);
    setError(null);
    try {
      const active = await linkedTrace.start(sessionId, nonce);
      setStatus(active);
      setPhase('active');
      linkedTrace.record('test_marker', { kind: 'session', phase: 'start', label: 'consent_confirmed' });
    } catch {
      setError('The local trace could not start. Reopen this screen from Walking Recorder.');
    } finally { setBusy(false); }
  };

  const markCanary = (canaryPhase: CanaryPhase, outcome: CanaryOutcome) => {
    if (canaryPhase === 'lock') setLockOutcome(outcome);
    else setUnlockOutcome(outcome);
    linkedTrace.record('canary_outcome', {
      phase: canaryPhase,
      outcome,
      expected: canaryPhase === 'lock' ? 'shield_visible' : 'app_opened',
    });
  };

  const markPhase = (canaryPhase: CanaryPhase) => {
    linkedTrace.record('test_marker', { kind: 'canary_check', phase: canaryPhase, label: 'observation_started' });
  };

  const stopAndExport = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      linkedTrace.record('test_marker', { kind: 'session', phase: 'stop', label: 'operator_finished' });
      const uri = await linkedTrace.stop(sessionId, nonce);
      setExportUri(uri);
      setStatus(await linkedTrace.status());
      setPhase('exported');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/x-ndjson' });
    } catch {
      setError('The trace could not be finalized. Keep the app installed and try again.');
    } finally { setBusy(false); }
  };

  return (
    <ScreenShell orangeBackground={false} contentStyle={s.content}>
      <Heading title={title} support="Research-only build · local export · two-hour session limit" />
      <StatusCard
        title={phase === 'active'
          ? status?.active === false ? 'Two-hour recording limit reached' : 'Local diagnostic recording active'
          : phase === 'exported' ? 'Recording stopped' : phase === 'deleted' ? 'Files removed' : 'Not recording'}
        subtitle={validHandshake ? `Session ${sessionId.slice(0, 8)}…` : 'Open the one-time link from Walking Recorder.'}
        nextChange={status?.truncated ? 'Trace reached its size limit.' : 'No GPS, microphone, camera, or Health history is collected.'}
        unlocked={phase !== 'active'}
      />

      {phase === 'idle' ? (
        <View style={s.section}>
          <Label variant="section">Consent</Label>
          <Label tone="secondary">
            This records local motion callbacks, detector transitions, policy and watchdog operations, extension callbacks,
            and shield-write return values. It cannot prove what is visibly shown; you mark that below.
          </Label>
          <ChoiceRow
            title="I consent to this local research trace"
            support="Nothing is uploaded automatically. You choose whether to share the exported files."
            selected={consented}
            multiple
            onPress={() => setConsented((value) => !value)}
          />
          <PrimaryButton label={busy ? 'Starting…' : 'Start linked trace'} disabled={!validHandshake || !consented || busy} onPress={() => void begin()} />
        </View>
      ) : null}

      {phase === 'active' ? (
        <View style={s.section}>
          <Label variant="section">Visible canary checks</Label>
          <Label tone="secondary">
            Use only the benign canary app selected in Screen Time. Walking Recorder must never be selected for shielding.
          </Label>
          <SecondaryButton label="Begin lock check" onPress={() => markPhase('lock')} />
          <ChoiceRow title="Lock check: shield was visible" selected={lockOutcome === 'shield_visible'} onPress={() => markCanary('lock', 'shield_visible')} />
          <ChoiceRow title="Lock check: canary opened" selected={lockOutcome === 'app_opened'} onPress={() => markCanary('lock', 'app_opened')} />
          <ChoiceRow title="Lock check: unsure" selected={lockOutcome === 'uncertain'} onPress={() => markCanary('lock', 'uncertain')} />
          <SecondaryButton label="Begin unlock check" onPress={() => markPhase('unlock')} />
          <ChoiceRow title="Unlock check: canary opened" selected={unlockOutcome === 'app_opened'} onPress={() => markCanary('unlock', 'app_opened')} />
          <ChoiceRow title="Unlock check: shield remained" selected={unlockOutcome === 'shield_visible'} onPress={() => markCanary('unlock', 'shield_visible')} />
          <ChoiceRow title="Unlock check: unsure" selected={unlockOutcome === 'uncertain'} onPress={() => markCanary('unlock', 'uncertain')} />
          <PrimaryButton label={busy ? 'Finalizing…' : status?.active === false ? 'Finalize expired trace' : 'End trace and export'} disabled={busy} onPress={() => void stopAndExport()} />
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

const s = StyleSheet.create({
  content: { gap: t.space.xl, paddingBottom: t.space.xxxl },
  section: { gap: t.space.lg },
  error: { color: t.state.error },
});
