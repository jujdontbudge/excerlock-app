import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useRuntime } from '../ports/useRuntime';
import type { BankDrainDiagnosticState } from '../ports/BankDrainDiagnosticPort';
import { MAX_DEVICE_ACTIVITY_MONITORS } from '../ports/watchdog';
import { SettingsPage } from '../ui/SettingsPage';
import { Heading, Label, PrimaryButton, SecondaryButton, SettingsGroup, SegmentedControl, TextField } from '../ui';
import { tokens as t } from '../ui/tokens';
import { bankDrainCopy as c } from './lib/bankDrainCopy';

export function BankDrainDiagnosticScreen({ onBack }: { onBack: () => void }) {
  const diagnostic = useRuntime().bankDrainDiagnostic;
  const [state, setState] = useState<BankDrainDiagnosticState | null>(null);
  const [minutes, setMinutes] = useState('15');
  const [tickMinutes, setTickMinutes] = useState<1 | 5>(1);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!__DEV__ || !diagnostic) return;
    let live = true;
    let reading = false;
    const refresh = async () => {
      if (!live || reading || AppState.currentState !== 'active') return;
      reading = true;
      try {
        const next = await diagnostic.snapshot();
        if (live) setState(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      } catch { if (live) setFailed(true); }
      finally { reading = false; }
    };
    void refresh();
    const timer = setInterval(() => { void refresh(); }, 1000);
    const foreground = AppState.addEventListener('change', value => { if (value === 'active') void refresh(); });
    return () => { live = false; clearInterval(timer); foreground.remove(); };
  }, [diagnostic]);
  const run = async (operation: () => Promise<void>) => {
    if (!diagnostic || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await operation();
      setState(await diagnostic.snapshot());
    } catch { setFailed(true); }
    finally { setBusy(false); }
  };
  const available = __DEV__ && diagnostic && state?.available;
  const PickerHost = diagnostic?.pickerHost;
  return (
    <SettingsPage onBack={onBack}>
      <Heading centered title={c.title} support={c.support} />
      {available ? (
        <>
          <SettingsGroup>
            <Label style={{ padding: t.space.lg, textAlign: 'center' }}>{c.phase(state.phase)}</Label>
            <Label style={{ padding: t.space.lg, textAlign: 'center' }}>{c.used(state.usedMinutes)}</Label>
            <Label style={{ padding: t.space.lg, textAlign: 'center' }}>{c.bank(state.bankMinutes)}</Label>
            <Label variant="support" style={{ padding: t.space.lg, textAlign: 'center' }}>{c.monitors(state.monitorRegistered, state.activeMonitorCount, MAX_DEVICE_ACTIVITY_MONITORS)}</Label>
            <Label variant="support" style={{ padding: t.space.lg, textAlign: 'center' }}>{c.events(state.eventCount, state.tickMinutes)}</Label>
            <Label variant="support" style={{ padding: t.space.lg, textAlign: 'center' }}>{c.shield(state.shieldConfigured)}</Label>
          </SettingsGroup>
          <SecondaryButton label={c.choose} disabled={busy} onPress={() => { void run(() => diagnostic.chooseLockedApps()); }} />
          <TextField centered label={c.minutes} value={minutes} onChangeText={setMinutes} keyboardType="decimal-pad" />
          <SegmentedControl
            options={['1 minute', '5 minutes']}
            value={tickMinutes === 5 ? '5 minutes' : '1 minute'}
            onChange={value => setTickMinutes(value === '5 minutes' ? 5 : 1)}
          />
          <PrimaryButton label={c.arm} disabled={busy || !Number.isFinite(Number(minutes)) || Number(minutes) < 0 || !minutes.trim()} onPress={() => { void run(() => diagnostic.arm(Number(minutes), tickMinutes)); }} />
          <SecondaryButton label={c.disarm} disabled={busy} onPress={() => { void run(() => diagnostic.disarm()); }} />
          {failed ? <Label style={{ textAlign: 'center' }}>{c.error}</Label> : null}
          <SettingsGroup title={c.recent}>
            <Label variant="micro" style={{ padding: t.space.lg, textAlign: 'center' }}>{c.armed(state.armedAt)}</Label>
            <Label variant="micro" style={{ padding: t.space.lg, textAlign: 'center' }}>{c.observed(state.observedAt)}</Label>
            {state.ticks.length ? state.ticks.map(tick => (
              <Label key={`${tick.observedAt}:${tick.usedMinutes}`} variant="support" style={{ padding: t.space.lg, textAlign: 'center' }}>{c.tickEntry(tick.usedMinutes, tick.observedAt)}</Label>
            )) : <Label style={{ padding: t.space.lg, textAlign: 'center' }}>{c.noTicks}</Label>}
          </SettingsGroup>
        </>
      ) : <Label style={{ textAlign: 'center' }}>{failed ? c.readError : c.unavailable}</Label>}
      {__DEV__ && PickerHost ? <PickerHost /> : null}
    </SettingsPage>
  );
}
