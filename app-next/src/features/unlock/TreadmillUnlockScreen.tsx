import { useEffect, useRef, useState } from 'react';
import { AppState, Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Heading, Label, PrimaryButton, SecondaryButton } from '../../design-system';
import { UnlockLockFrame } from '../../design-system/UnlockLockFrame';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { ruleDaysStore as useRuleDaysStore } from '../../state/ruleDaysStore';
import { permissionsStore } from '../../state/permissionsStore';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { dayKey } from '../../domain/calendar';
import { unlockCopy as c } from '../../content/unlock';
import { feedback } from '../../motion/haptics';
import { TreadmillScanController, TreadmillScanSnapshot } from '../../engine/signals/gait/TreadmillScanController';
import { useCeremony } from './useCeremony';
import { UnlockLayout, Detected } from './UnlockLayout';
import { isTreadmillCeremonyRule, walkingDurationRule } from './walkingDurationRule';
import { requestHomeWalkingSheet } from '../home/homeSheetRequest';
import { leaseClock } from '../home/statusContent';

type TerminalFailure = 'expired' | 'bookingFailed' | 'invalidRule' | 'scanFailed' | null;

// merge: replace with P2-T09's lease-warning threshold once notifications land.
// P2-T09 schedules the warning at leaseUntil − 30 s; the screen says the same
// thing at the same moment so the notification and the screen never disagree.
const LEASE_WARNING_MS = 30_000;

export function TreadmillUnlockScreen({ ruleId, preview = false }: { ruleId?: string; preview?: boolean }) {
  const runtime = useRuntime(),
    router = useRouter();
  const [provider] = useState(() => (preview ? runtime.dev.createGaitPreview() : runtime.gait));
  const [snapshot, setSnapshot] = useState<TreadmillScanSnapshot>({ phase: 'idle', confidence: 0 });
  const [booked, setBooked] = useState(false),
    [durationStage, setDurationStage] = useState<'scan' | 'detected' | 'counting'>('scan'),
    [terminal, setTerminal] = useState<TerminalFailure>(null),
    [error, setError] = useState('');
  const controller = useRef<TreadmillScanController | null>(null),
    verified = useRef(false),
    sessionStarted = useRef(false),
    active = useRef(true),
    retry = useRef<() => Promise<void>>(async () => undefined),
    terminalRef = useRef<TerminalFailure>(null),
    durationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rule = useRulesStore((store) => store.data.rules.find((candidate) => candidate.id === ruleId));
  const duration = walkingDurationRule(rule);
  const { days, walkingSession } = useRuleDaysStore((store) => store.data);
  const entitlement = useEntitlementStore((store) => store.data.entitlement.status);
  const lapsed = entitlement === 'expired' || entitlement === 'billingIssue';
  const row = rule
    ? days.find(
        (candidate) =>
          candidate.ruleId === rule.id && candidate.day === dayKey(runtime.clock.now(), runtime.clock.timezone()),
      )
    : undefined;
  const walkingBooked =
    preview ||
    (booked && walkingSession !== null && walkingSession.ruleId === rule?.id && walkingSession.phase === 'walking');
  const goalMet = Boolean(duration && row?.met);
  const lifted = duration ? goalMet : walkingBooked;
  const ringValue =
    duration && durationStage === 'counting'
      ? Math.min(1, Math.max(0, (row?.progress ?? 0) / duration.mode.goal))
      : snapshot.confidence;
  const successBody = lapsed
    ? c.lapsed.body
    : duration
      ? c.treadmill.unlockedToday
      : c.treadmill.detectedBody;
  const successTitle = duration ? c.treadmill.goalReached : c.treadmill.detected;
  const ceremony = useCeremony(ringValue, lifted, successTitle);

  const stopUnbookedSession = () => {
    if (!preview && sessionStarted.current && !verified.current) runtime.walking.stop();
    if (!verified.current) sessionStarted.current = false;
  };

  const close = () => {
    if (verified.current) runtime.analytics.track('unlock_ceremony_done', { kind: 'treadmill', preview });
    stopUnbookedSession();
    router.back();
  };

  useEffect(() => {
    active.current = true;
    runtime.analytics.track('unlock_screen_opened', { kind: 'treadmill', preview });
    const scanStartedAt = Date.now();
    const scanController = new TreadmillScanController({
      provider,
      now: Date.now,
      onVerified: () => {
        const accepted = preview || runtime.walking.completeProppedScan();
        const session = useRuleDaysStore.getState().data.walkingSession;
        const hasWalkingSession =
          preview ||
          (accepted && session !== null && session.ruleId === rule?.id && session.phase === 'walking');
        if (!hasWalkingSession) {
          terminalRef.current = 'bookingFailed';
          setTerminal('bookingFailed');
          setError(c.treadmill.bookingFailed);
          return;
        }
        verified.current = true;
        setBooked(true);
        if (duration) {
          setDurationStage('detected');
          feedback('success');
          durationTimer.current = setTimeout(() => {
            if (active.current) setDurationStage('counting');
          }, 1_500);
        }
        runtime.analytics.track('treadmill_scan_verified', { ms: Date.now() - scanStartedAt, preview });
      },
      onPermissionDenied: () => {
        permissionsStore.getState().patch({ camera: 'denied' });
        stopUnbookedSession();
        runtime.analytics.track('treadmill_scan_failed', { reason: 'denied' });
      },
      onExpired: () => {
        if (!preview) runtime.walking.stop();
        sessionStarted.current = false;
        terminalRef.current = 'expired';
        setTerminal('expired');
        runtime.analytics.track('treadmill_scan_failed', { reason: 'timeout' });
      },
    });
    controller.current = scanController;
    const unsubscribe = scanController.subscribe(() => {
      if (active.current) setSnapshot(scanController.getSnapshot());
    });

    const begin = async () => {
      terminalRef.current = null;
      setTerminal(null);
      setError('');
      setBooked(false);
      setDurationStage('scan');
      verified.current = false;
      try {
        if (!preview) {
          if (!isTreadmillCeremonyRule(rule)) {
            terminalRef.current = 'invalidRule';
            setTerminal('invalidRule');
            return;
          }
          const permission = await provider.permission();
          permissionsStore.getState().patch({ camera: permission });
          if (permission !== 'granted') {
            setSnapshot({ phase: 'permissionDenied', confidence: 0 });
            runtime.analytics.track('treadmill_scan_failed', { reason: permission });
            return;
          }
          runtime.dev.setPlacement('propped');
          await runtime.walking.start(rule, { placement: 'propped' });
          sessionStarted.current = true;
        }
        if (active.current) {
          runtime.analytics.track('treadmill_scan_started', { preview });
          await scanController.start();
        }
      } catch (cause) {
        // The reason is for the log, not the user: a raw exception message under
        // the idle "prop your phone" heading is the silent shield in disguise.
        runtime.analytics.track('treadmill_scan_failed', {
          reason: cause instanceof Error ? cause.message : 'unknown',
        });
        if (!active.current) return;
        terminalRef.current = 'scanFailed';
        setTerminal('scanFailed');
      }
    };
    retry.current = async () => {
      stopUnbookedSession();
      await scanController.stop();
      if (active.current) await begin();
    };
    void begin();

    const appState = AppState.addEventListener('change', (state) => {
      if (verified.current || terminalRef.current) return;
      if (state === 'active') {
        if (sessionStarted.current || preview) void scanController.start();
      } else {
        void scanController.stop();
      }
    });
    return () => {
      active.current = false;
      appState.remove();
      unsubscribe();
      if (durationTimer.current) clearTimeout(durationTimer.current);
      void scanController.stop();
      stopUnbookedSession();
      controller.current = null;
    };
  }, [runtime, provider, preview, rule, duration]);

  const handheld = async () => {
    if (rule && !preview) {
      stopUnbookedSession();
      runtime.dev.setPlacement('handheld');
      await runtime.walking.start(rule);
      verified.current = true;
      requestHomeWalkingSheet(rule.id);
    }
    router.back();
  };

  const denied = snapshot.phase === 'permissionDenied';
  const failed = terminal !== null;
  const scanning = snapshot.confidence > 0 && !booked;
  const framing = snapshot.phase === 'needsFraming';
  const remaining = duration ? Math.max(0, Math.ceil(duration.mode.goal - (row?.progress ?? 0))) : 0;
  const counting = Boolean(duration && durationStage === 'counting' && !goalMet);
  const leaseNearlyOver = Boolean(
    walkingSession && Date.parse(walkingSession.leaseUntil) - Date.parse(runtime.clock.now()) <= LEASE_WARNING_MS,
  );
  const detected = Boolean(duration && durationStage === 'detected' && !goalMet);
  const title = failed
    ? terminal === 'expired'
      ? c.treadmill.expired
      : terminal === 'invalidRule'
        ? c.treadmill.invalidRule
        : terminal === 'scanFailed'
          ? c.treadmill.scanFailed
          : c.treadmill.bookingFailed
    : denied
      ? c.treadmill.denied
      : counting
        ? c.treadmill.counting
        : framing
          ? c.treadmill.framing
          : scanning
            ? c.treadmill.scanning
            : c.treadmill.prop;
  const body = failed
    ? terminal === 'expired'
      ? c.treadmill.expiredBody
      : terminal === 'invalidRule'
        ? c.treadmill.invalidRuleBody
        : terminal === 'scanFailed'
          ? c.treadmill.scanFailedBody
          : undefined
    : denied
      ? c.treadmill.deniedBody
      : counting
        ? lapsed
          ? c.treadmill.remainingLapsed(remaining)
          : c.treadmill.remaining(remaining)
        : framing
          ? c.treadmill.framingBody
          : scanning
            ? c.treadmill.scanningBody
            : c.treadmill.propBody;
  const Preview = provider.Preview;

  const celebrating = ceremony.showMessage || ceremony.done;
  const footer = celebrating ? (
    ceremony.done || lapsed ? (
      <>
        {ceremony.done ? <PrimaryButton label={c.done} onPress={close} /> : null}
        {lapsed ? <SecondaryButton label={c.seePlans} onPress={() => router.push('/paywall')} /> : null}
      </>
    ) : undefined
  ) : terminal === 'invalidRule' ? (
    <PrimaryButton label={c.done} onPress={close} />
  ) : failed ? (
    <>
      <PrimaryButton label={c.treadmill.retry} onPress={() => void retry.current()} />
      <SecondaryButton label={c.treadmill.handheld} onPress={() => void handheld()} />
    </>
  ) : denied ? (
    <>
      <PrimaryButton label={c.treadmill.handheld} onPress={() => void handheld()} />
      <SecondaryButton label={c.treadmill.openSettings} onPress={() => void Linking.openSettings()} />
    </>
  ) : undefined;

  const overlay = detected ? (
    <Detected title={c.treadmill.detected} body={c.treadmill.durationDetectedBody(duration!.mode.goal)} />
  ) : ceremony.showMessage ? (
    <Detected title={successTitle} body={successBody} />
  ) : undefined;

  return (
    <UnlockLayout close={close} preview={preview} footer={footer}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={c.treadmill.progressLabel}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(ringValue * 100) }}>
        <UnlockLockFrame
          celebrate={!lapsed}
          progress={ceremony.progress}
          phase={lifted ? 'lifted' : scanning || counting || detected ? 'working' : 'idle'}
          surface={<Preview />}
          overlay={overlay}
        />
      </View>
      {!overlay ? <Heading title={title} support={body} /> : null}
      {counting && walkingSession ? (
        <>
          <Label>{c.treadmill.leaseRemaining(leaseClock(walkingSession.leaseUntil, runtime.clock.now()))}</Label>
          {leaseNearlyOver ? (
            <Label variant="support" tone="secondary">{c.treadmill.scanAgain}</Label>
          ) : null}
        </>
      ) : null}
      <Label variant="support" tone="secondary">{c.treadmill.privacy}</Label>
      {error ? <Label accessibilityRole="alert">{error}</Label> : null}
    </UnlockLayout>
  );
}
