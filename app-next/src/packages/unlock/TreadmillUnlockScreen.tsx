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
import { haptic } from '../ui/haptics';
export function TreadmillUnlockScreen({ ruleId, preview = false }: { ruleId?: string; preview?: boolean }) {
  const runtime = useRuntime(),
    router = useRouter();
  const [provider] = useState(() =>
    preview && __DEV__ && runtime.dev ? runtime.dev.createGaitPreview() : runtime.gait,
  );
  const [snapshot, setSnapshot] = useState<TreadmillScanSnapshot>({ phase: 'idle', confidence: 0 });
  const handedOff = useRef(false);
  const verified = useRef(false),
    rule = useRulesStore((s) => s.data.rules.find((r) => r.id === ruleId));
  const denied = snapshot.phase === 'permissionDenied';
  const ceremony = useCeremony(snapshot.confidence, snapshot.phase === 'verified', c.treadmill.detected, {
      paced: true,
    }),
    lifted = ceremony.lifted;
  const close = () => {
    if (verified.current) runtime.analytics.track('unlock_ceremony_done', { kind: 'treadmill', preview });
    if (!preview && !handedOff.current) runtime.walking.stop();
    router.back();
  };
  useEffect(() => {
    let active = true;
    let foreground = AppState.currentState === 'active';
    let recordedPass = false;
    runtime.analytics.track('unlock_screen_opened', { kind: 'treadmill', preview });
    const start = Date.now();
    const controller = new TreadmillScanController({
      provider,
      now: Date.now,
      onVerified: async () => {
        if (!active || !foreground || handedOff.current) return false;
        if (!preview) {
          if (!rule) return false;
          await runtime.walking.start(rule, { placement: 'propped' });
          if (!active || !foreground || handedOff.current) { runtime.walking.stop(); return false; }
          if (!runtime.walking.completeProppedScan()) return false;
        }
        verified.current = true;
        if (!recordedPass) runtime.analytics.track('treadmill_scan_verified', { ms: Date.now() - start, preview });
        recordedPass = true;
        return true;
      },
      onUnverified: () => {
        verified.current = false;
        if (!preview && !handedOff.current) runtime.walking.stop();
      },
      onPermissionDenied: () => {
        if (!preview && !handedOff.current) runtime.walking.stop();
        runtime.analytics.track('treadmill_scan_failed', { reason: 'denied' });
        haptic('warning');
      },
      onExpired: () => {
        if (!preview && !handedOff.current) runtime.walking.stop();
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
        if (active && foreground && !handedOff.current) {
          runtime.analytics.track('treadmill_scan_started', { preview });
          await controller.start();
        }
      } catch (e) {
        reportRuntimeError(e);
        if (active) {
          notify(c.retry);
          haptic('error');
        }
      }
    };
    void startScan();
    const app = AppState.addEventListener('change', (state) => {
      foreground = state === 'active';
      if (foreground && !handedOff.current) void controller.start();
      else void controller.stop();
    });
    return () => {
      active = false;
      app.remove();
      stop();
      void controller.stop();
      if (!preview && !handedOff.current) runtime.walking.stop();
    };
  }, [runtime, provider, preview, rule, router]);
  const scanning = snapshot.confidence > 0 || lifted,
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
        ? undefined
        : c.treadmill.propBody;
  const walkInHand = async () => {
    if (rule && !preview) {
      handedOff.current = true;
      runtime.walking.stop();
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
          <PrimaryButton label={c.treadmill.stop} onPress={close} />
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
          overlay={ceremony.showMessage ? <Detected /> : undefined}
        />
      </View>
      {ceremony.showMessage ? (
        <Heading key="detected" title={c.treadmill.detected} support={c.treadmill.keepOpen} centered />
      ) : (
        <Heading key={title} title={title} support={body} centered />
      )}
    </UnlockLayout>
  );
}
