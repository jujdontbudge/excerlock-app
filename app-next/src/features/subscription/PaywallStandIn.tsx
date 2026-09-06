import { Heading, ChoiceRow, Label, ScreenShell, PrimaryButton, SecondaryButton } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { subscriptionCopy as c } from '../../content/subscription';
export function PaywallStandIn({
  selected,
  onSelect,
  busy,
  message,
  onStart,
  onRestore,
}: {
  selected: string;
  onSelect: (id: string) => void;
  busy: 'purchase' | 'restore' | null;
  message: string;
  onStart: () => void;
  onRestore: () => void;
}) {
  return (
    <ScreenShell
      footer={
        <>
          <PrimaryButton
            label={selected === 'annual' ? c.start : c.continue}
            loading={busy === 'purchase'}
            disabled={busy === 'restore'}
            onPress={onStart}
          />
          <SecondaryButton label={c.restore} disabled={busy !== null} variant="tertiary" onPress={onRestore} />
        </>
      }>
      <Reveal>
        <Heading title={c.title} support={c.body} />
      </Reveal>
      <LivingIcon name="lock-open" />
      {message ? (
        <Reveal key={message}>
          <Label accessibilityRole="alert" style={{ color: t.state.error }}>
            {message}
          </Label>
        </Reveal>
      ) : null}
      {c.plans.map((plan, index) => (
        <Reveal key={plan.id} index={index + 1}>
          <ChoiceRow
            title={plan.title}
            support={plan.price}
            selected={selected === plan.id}
            recommended={plan.id === 'annual'}
            onPress={() => {
              if (!busy) onSelect(plan.id);
            }}
          />
        </Reveal>
      ))}
      {busy ? (
        <Reveal>
          <Label accessibilityRole="alert" tone="secondary">
            {busy === 'purchase' ? c.purchasing : c.restoring}
          </Label>
        </Reveal>
      ) : null}
      <Reveal index={4}>
        <Label variant="support" tone="secondary">
          {c.terms}
        </Label>
      </Reveal>
    </ScreenShell>
  );
}
