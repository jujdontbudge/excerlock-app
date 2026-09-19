import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { BottomSheet, ChoiceRow, Heading, Label, PrimaryButton } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { incidentCopy as i } from '../../content/incident';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { feedback } from '../../motion/haptics';
import { useMotion } from '../../motion/useMotion';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { activityTruthStore, type ActivityTruth } from '../../state/activityTruthStore';

const h = i.home;
const ACTIVITIES: { id: ActivityTruth; label: string }[] = [
  { id: 'walking', label: h.walking },
  { id: 'sitting', label: h.sitting },
  { id: 'shaking', label: h.shaking },
  { id: 'treadmill', label: h.treadmill },
];
type Reason = 'stillLocked' | 'wronglyOpen' | 'other';
const REASONS: { id: Reason; label: string }[] = [
  { id: 'stillLocked', label: h.stillLocked },
  { id: 'wronglyOpen', label: h.wronglyOpen },
  { id: 'other', label: h.other },
];
const activityLabel = (activity: ActivityTruth | null) => ACTIVITIES.find((a) => a.id === activity)?.label ?? null;

/** Locked → the person is most likely still locked; any unlocked state → most likely wrongly open. */
export function defaultReason(lockState: string): Reason {
  return lockState === 'locked' ? 'stillLocked' : lockState.startsWith('unlocked') ? 'wronglyOpen' : 'other';
}

/**
 * The Home bug report: four hold-down ground-truth chips (one active label) and one Report button
 * that opens a sheet where Send is the only other tap. The runtime attaches the diagnostic snapshot,
 * which carries the held label; the words carry it too so a human reads it first.
 */
export function HomeReport({ lockState }: { lockState: string }) {
  const runtime = useRuntime(),
    held = activityTruthStore((s) => s.data),
    activity = held?.activity ?? null,
    [nudged, setNudged] = useState(false),
    [open, setOpen] = useState(false);
  useEffect(() => {
    if (!nudged) return;
    const timer = setTimeout(() => setNudged(false), 1500);
    return () => clearTimeout(timer);
  }, [nudged]);
  const hold = (next: ActivityTruth) => {
    feedback('success');
    activityTruthStore.getState().hold(next, Date.parse(runtime.clock.now()));
    runtime.analytics.track('activity_truth_held', { activity: next, lock_state: lockState });
  };
  return (
    <View
      testID="home-report"
      style={{
        backgroundColor: t.surface.card,
        borderRadius: t.radius.card,
        borderWidth: t.stroke.hairline,
        borderColor: t.border.outline,
        padding: t.space.lg,
        gap: t.space.md,
      }}>
      <Label variant="label" style={{ textAlign: 'center' }}>
        {nudged ? h.nudge : h.caption}
      </Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md }}>
        {ACTIVITIES.map((entry) => (
          <HoldChip
            key={entry.id}
            label={entry.label}
            active={activity === entry.id}
            onHold={() => hold(entry.id)}
            onTap={() => setNudged(true)}
          />
        ))}
      </View>
      <PrimaryButton label={h.report} accessibilityLabel={h.reportLabel} testID="home-report-button" onPress={() => setOpen(true)} />
      {open ? <ReportSheet lockState={lockState} activity={activity} onDismiss={() => setOpen(false)} /> : null}
    </View>
  );
}

function HoldChip({ label, active, onHold, onTap }: { label: string; active: boolean; onHold: () => void; onTap: () => void }) {
  const [pressed, setPressed] = useState(false);
  const m = useMotion();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={h.caption}
      accessibilityState={{ selected: active }}
      testID={`home-truth-${label.toLowerCase()}`}
      delayLongPress={350}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      onLongPress={onHold}
      onPress={onTap}
      style={{ flexBasis: '46%', flexGrow: 1 }}>
      <Animated.View
        style={{
          minHeight: t.layout.button,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: t.space.lg,
          borderRadius: t.radius.pill,
          borderWidth: active ? t.stroke.selected : t.stroke.hairline,
          borderColor: active ? t.border.selected : t.border.outline,
          backgroundColor: active ? t.surface.selected : t.surface.card,
          transform: [{ scale: pressed ? m.scale.pressed : 1 }],
          transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
          transitionDuration: m.duration.press,
        }}>
        <Label variant="section" style={{ textAlign: 'center' }}>
          {label}
        </Label>
      </Animated.View>
    </Pressable>
  );
}

function ReportSheet({ lockState, activity, onDismiss }: { lockState: string; activity: ActivityTruth | null; onDismiss: () => void }) {
  const runtime = useRuntime(),
    [reason, setReason] = useState<Reason>(() => defaultReason(lockState)),
    [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle'),
    [message, setMessage] = useState<{ text: string; reason?: string } | null>(null);
  const reasonLabel = REASONS.find((r) => r.id === reason)!.label,
    heldLabel = activityLabel(activity);
  const words = useMemo(
    () => ({ whatWentWrong: h.words(reasonLabel, heldLabel), shouldHaveHappened: h.expected[reason] }),
    [reasonLabel, heldLabel, reason],
  );
  const send = async () => {
    if (state === 'sending') return;
    setMessage(null);
    setState('sending');
    try {
      await runtime.incidentReports.send(words);
      runtime.analytics.track('incident_report_sent', { source: 'home', activity: activity ?? 'none', lock_state: lockState });
      setState('sent');
    } catch (error) {
      setState('idle');
      setMessage({ text: i.error, reason: error instanceof Error ? error.message : String(error) });
    }
  };
  if (state === 'sent')
    return (
      <BottomSheet open title={h.sheetTitle} onDismiss={onDismiss} footer={<PrimaryButton label={h.done} onPress={onDismiss} />}>
        <Heading title={i.sentTitle} support={h.sentBody} />
        <LivingIcon name="check" />
      </BottomSheet>
    );
  return (
    <BottomSheet
      open
      title={h.sheetTitle}
      onDismiss={onDismiss}
      footer={<PrimaryButton label={state === 'sending' ? i.sending : i.send} loading={state === 'sending'} onPress={() => void send()} />}>
      <View style={{ gap: t.space.md }}>
        {REASONS.map((entry) => (
          <ChoiceRow key={entry.id} title={entry.label} selected={reason === entry.id} onPress={() => setReason(entry.id)} />
        ))}
      </View>
      <Label variant="label" style={{ textAlign: 'center' }}>
        {h.summary(reasonLabel, heldLabel)}
      </Label>
      {message ? (
        <Reveal key={message.text + (message.reason ?? '')}>
          <Label accessibilityRole="alert">{message.text}</Label>
          {message.reason ? (
            <Label tone="secondary" variant="support">
              {message.reason}
            </Label>
          ) : null}
        </Reveal>
      ) : null}
    </BottomSheet>
  );
}
