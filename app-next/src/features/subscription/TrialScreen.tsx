import { useState } from 'react';
import { View } from 'react-native';
import { Heading, Label, PrimaryButton, SecondaryButton, TrialTimeline } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { Icon } from '../../icons/Icon';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { subscriptionCopy as c } from '../../content/subscription';
export function TrialScreen({ step, onContinue }: { step: 'T1' | 'T2' | 'T3' | 'T4'; onContinue: () => void }) {
  const runtime = useRuntime(),
    [busy, setBusy] = useState(false),
    offer = runtime.subscription.entitlement().offer;
  const request = async () => {
    if (busy) return;
    setBusy(true);
    await runtime.notifications.request();
    setBusy(false);
    onContinue();
  };
  return (
    <>
      <Heading
        title={c[step]}
        support={
          step === 'T1' ? c.offerBody : step === 'T2' ? c.reminderBody : step === 'T3' ? c.notificationBody : undefined
        }
      />
      <LivingIcon name={step === 'T1' ? 'lock-open' : 'bell'} />
      {step === 'T1' ? (
        <>
          <Reveal>
            <Label variant="metricSmall" style={{ color: t.brand.primary, textAlign: 'center' }}>
              {offer.label}
            </Label>
          </Reveal>
          {c.benefits.map((b, index) => (
            <Reveal
              key={b.text}
              index={index + 1}
              style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.lg }}>
              <Icon name={b.icon} />
              <Label style={{ flex: 1 }}>{b.text}</Label>
            </Reveal>
          ))}
        </>
      ) : null}
      {step === 'T2' ? (
        <Reveal index={1}>
          <Label variant="metricSmall" style={{ textAlign: 'center', color: t.brand.primary }}>
            {c.reminder(offer)}
          </Label>
        </Reveal>
      ) : null}
      {step === 'T3' ? (
        <>
          <Reveal
            index={1}
            style={{
              backgroundColor: t.surface.subtle,
              borderRadius: t.radius.card,
              padding: t.space.xl,
              gap: t.space.sm,
            }}>
            <Label variant="label">{c.T3}</Label>
            <Label tone="secondary">{c.reminder(offer)}</Label>
          </Reveal>
          <View style={{ flexGrow: 1 }} />
          <PrimaryButton label={c.enable} loading={busy} onPress={request} />
          <SecondaryButton label={c.later} variant="tertiary" disabled={busy} onPress={onContinue} />
        </>
      ) : null}
      {step === 'T4' ? <TrialTimeline milestones={c.timeline(offer)} /> : null}
    </>
  );
}
