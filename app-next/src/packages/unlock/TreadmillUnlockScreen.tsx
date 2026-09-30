import { useEffect, useRef, useState } from 'react';
import { AppState, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heading, PrimaryButton } from '../ui';
import { notify } from '../ui/Notice';
import { reportRuntimeError } from '../telemetry/reportRuntimeError';
import { UnlockLockFrame } from './lib/UnlockLockFrame';
import { useRuntime } from '../ports/useRuntime';
import { rulesStore as useRulesStore } from '../conditions/rulesStore';
import { unlockCopy as c } from './lib/unlockCopy';
import { TreadmillScanController, TreadmillScanSnapshot } from './lib/gait/TreadmillScanController';
import { useCeremony } from './lib/useCeremony';
import { UnlockLayout, Detected } from './lib/UnlockLayout';
export function TreadmillUnlockScreen({ ruleId, preview = false }: { ruleId?: string; preview?: boolean }) {
  const runtime = useRuntime(),
    router = useRouter();
  const [provider] = useState(() =>
    preview && __DEV__ && runtime.dev ? runtime.dev.createGaitPreview() : runtime.gait,
  );
  const [snapshot, setSnapshot] = useState<TreadmillScanSnapshot>({ phase: 'idle', confidence: 0 });
  const verified = useRef(false),
    rule = useRulesStore((s) => s.data.rules.find((r) => r.id === ruleId));
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
          await runtime.walking.start(rule, { placement: 'propped' });
        }
        if (active) {
          runtime.analytics.track('treadmill_scan_started', { preview });
          await controller.start();
        }
      } catch (e) {
        reportRuntimeError(e);
        if (active) notify(c.retry);
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
  const walkInHand = async () => {
    if (rule && !preview) {
      await runtime.walking.start(rule);
      verified.current = true;
    }
    router.back();
  };
  const Preview = provider.Preview;
  return (
    <UnlockLayout
      close={close}
      preview={preview}
      footer={
        ceremony.done ? (
          <PrimaryButton label={c.done} onPress={close} />
        ) : (
          <PrimaryButton
            label={denied ? c.treadmill.handheld : c.treadmill.walking}
            onPress={() => void walkInHand()}
          />
        )
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
    </UnlockLayout>
  );
}
