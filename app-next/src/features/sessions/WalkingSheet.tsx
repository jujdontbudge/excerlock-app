import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Label, PrimaryButton, SecondaryButton, Heading } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { LivingIcon } from '../../motion/LivingIcon';
import { TickingNumber } from '../../motion/TickingNumber';
import { Reveal } from '../../motion/Reveal';
import { Rule } from '../../domain/types';
import { ruleDaysStore as useRuleDaysStore } from '../../state/ruleDaysStore';
import { useClock, useDevSnapshot } from '../../state/selectors';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { leaseClock } from '../home/statusContent';
import { sessionCopy as c } from '../../content/sessions';
export function WalkingSheet({ rule, onDismiss }: { rule: Rule; onDismiss: () => void }) {
  const runtime = useRuntime(),
    now = useClock(),
    session = useRuleDaysStore((s) => s.data.walkingSession),
    [busy, setBusy] = useState(false);
  useDevSnapshot();
  const active = session?.ruleId === rule.id ? session : null,
    phase = active?.phase,
    detail = runtime.walking.details(),
    frame = runtime.walking.treadmillFraming(),
    treadmill = rule.mode.kind === 'state' && rule.mode.place === 'treadmill';
  const start = async () => {
    setBusy(true);
    try {
      await runtime.walking.start(rule);
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet
      open
      title={c.walk}
      onDismiss={onDismiss}
      footer={
        phase === 'ended' ? (
          <PrimaryButton
            label={c.done}
            onPress={() => {
              useRuleDaysStore.getState().patch({ walkingSession: null });
              onDismiss();
            }}
          />
        ) : active ? (
          <>
            <SecondaryButton label={c.stop} onPress={() => runtime.walking.stop()} />
            <SecondaryButton label={c.minimize} onPress={onDismiss} />
          </>
        ) : (
          <PrimaryButton
            label={c.start}
            loading={busy}
            disabled={treadmill && !frame.ready}
            onPress={() => void start()}
          />
        )
      }>
      <LivingIcon name={phase === 'ended' ? 'check' : 'walking'} size={t.layout.ring} />
      <Reveal key={phase ?? 'ready'}>
        <Heading
          title={
            phase === 'verifying'
              ? c.verifying
              : phase === 'walking'
                ? c.walking
                : phase === 'grace'
                  ? c.grace
                  : phase === 'ended'
                    ? c.ended
                    : c.ready
          }
          support={
            phase === 'verifying'
              ? c.verifyingBody
              : phase === 'walking'
                ? c.walkingBody
                : phase
                  ? undefined
                  : c.readyBody
          }
        />
      </Reveal>
      {phase === 'walking' && active ? (
        <Reveal>
          <Label variant="metricSmall">{leaseClock(active.leaseUntil, now)}</Label>
          <Label>{c.renewal}</Label>
        </Reveal>
      ) : null}
      {phase === 'grace' && detail.graceUntil ? (
        <Reveal>
          <Label variant="metricSmall">{leaseClock(detail.graceUntil, now)}</Label>
        </Reveal>
      ) : null}
      {active ? (
        <TickingNumber
          value={phase === 'ended' ? detail.walkingSeconds / 60 : detail.steps}
          precision={phase === 'ended' ? 1 : 0}
          label={phase === 'ended' ? c.minutes : c.steps}
        />
      ) : null}
      {treadmill && !active ? (
        <Reveal style={{ gap: t.space.lg }}>
          <Heading title={c.framing} support={c.framingBody} />
          <View
            accessibilityLabel={frame.placement === 'propped' ? c.propped : c.handheld}
            accessible
            style={{
              aspectRatio: 1,
              borderRadius: t.radius.card,
              borderWidth: t.stroke.chart,
              borderColor: t.icon.mint,
              backgroundColor: t.surface.subtle,
              justifyContent: 'center',
            }}>
            <LivingIcon name="person" size={t.layout.ring} />
          </View>
          <Label>{frame.ready ? c.frameReady : c.frameWaiting}</Label>
        </Reveal>
      ) : null}
    </BottomSheet>
  );
}
