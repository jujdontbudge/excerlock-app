import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heading, Label, PrimaryButton } from '../../design-system';
import { UnlockLockFrame } from '../../design-system/UnlockLockFrame';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { unlockCopy as c } from '../../content/unlock';
import { TreadmillScanController, TreadmillScanSnapshot } from './gait/TreadmillScanController';
import { useCeremony } from './useCeremony';
import { UnlockLayout, Detected } from './UnlockLayout';
export function TreadmillUnlockScreen({ ruleId, preview = false }: { ruleId?: string; preview?: boolean }) {
  const runtime = useRuntime(),
    router = useRouter();
  const [provider] = useState(() => (preview ? runtime.dev.createGaitPreview() : runtime.gait));
  const [snapshot, setSnapshot] = useState<TreadmillScanSnapshot>({ phase: 'idle', confidence: 0 });
  const verified = useRef(false),
    rule = useRulesStore((s) => s.data.rules.find((r) => r.id === ruleId));
  const [error, setError] = useState('');
  const lifted = snapshot.phase === 'verified',
    denied = snapshot.phase === 'permissionDenied';
  const ceremony = useCeremony(snapshot.confidence, lifted, c.treadmill.detected);
  const close = () => {
    if (verified.current) runtime.analytics.track('unlock_ceremony_done', { kind: 'treadmill', preview });
    if (!preview && !verified.current) runtime.walking.stop();
    router.back();
  };
  useEffect(() => {
    let active = true;
    runtime.analytics.track('unlock_screen_opened', { kind: 'treadmill', preview });
    const start = Date.now();
    const controller = new TreadmillScanController({
      provider,
      now: Date.now,
      onVerified: () => {
        verified.current = true;
        if (!preview) {
          runtime.walking.completeProppedScan();
        }
        runtime.analytics.track('treadmill_scan_verified', { ms: Date.now() - start, preview });
      },
      onPermissionDenied: () => {
        if (!preview) runtime.walking.stop();
        runtime.analytics.track('treadmill_scan_failed', { reason: 'denied' });
      },
      onExpired: () => {
        if (!preview) runtime.walking.stop();
        runtime.analytics.track('treadmill_scan_failed', { reason: 'timeout' });
        if (active) router.back();
      },
    });
    const stop = controller.subscribe(() => {
      if (active) setSnapshot(controller.getSnapshot());
    });
    const startScan = async () => {
      try {
        if (!preview) {
          if (!rule || rule.mode.kind !== 'state') throw new Error('Choose a treadmill walking condition first.');
          runtime.dev.setPlacement('propped');
          await runtime.walking.start(rule, { placement: 'propped' });
        }
        if (active) {
          runtime.analytics.track('treadmill_scan_started', { preview });
          await controller.start();
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Could not start the scan.');
      }
    };
    void startScan();
    const app = AppState.addEventListener('change', (state) => {
      if (verified.current) return;
      if (state === 'active') void controller.start();
      else void controller.stop();
    });
    return () => {
      active = false;
      app.remove();
      stop();
      void controller.stop();
      if (!preview && !verified.current) runtime.walking.stop();
    };
  }, [runtime, provider, preview, rule, router]);
  const scanning = snapshot.confidence > 0 && !lifted,
    framing = snapshot.phase === 'needsFraming';
  const title = denied
    ? c.treadmill.denied
    : framing
      ? c.treadmill.framing
      : scanning
        ? c.treadmill.scanning
        : c.treadmill.prop;
  const body = denied
    ? c.treadmill.deniedBody
    : framing
      ? c.treadmill.framingBody
      : scanning
        ? c.treadmill.scanningBody
        : c.treadmill.propBody;
  const Preview = provider.Preview;
  return (
    <UnlockLayout
      close={close}
      preview={preview}
      footer={
        ceremony.done ? (
          <PrimaryButton label={c.done} onPress={close} />
        ) : denied ? (
          <PrimaryButton
            label={c.treadmill.handheld}
            onPress={async () => {
              if (rule && !preview) {
                runtime.dev.setPlacement('handheld');
                await runtime.walking.start(rule);
                verified.current = true;
              }
              router.back();
            }}
          />
        ) : undefined
      }>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Scan progress"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(snapshot.confidence * 100) }}>
        <UnlockLockFrame
          progress={ceremony.progress}
          phase={lifted ? 'lifted' : scanning ? 'working' : 'idle'}
          surface={<Preview />}
          overlay={
            ceremony.showMessage ? <Detected title={c.treadmill.detected} body={c.treadmill.detectedBody} /> : undefined
          }
        />
      </View>
      {!ceremony.showMessage ? <Heading title={title} support={body} /> : null}
      <Label variant="support" tone="secondary">
        {c.treadmill.privacy}
      </Label>
      {error ? <Label accessibilityRole="alert">{error}</Label> : null}
    </UnlockLayout>
  );
}
