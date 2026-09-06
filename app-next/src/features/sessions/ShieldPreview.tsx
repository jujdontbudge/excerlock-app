import { useState } from 'react';
import { ScreenShell, Heading, Label, PrimaryButton, SecondaryButton, SegmentedControl } from '../../design-system';
import { useLockDecision } from '../../state/selectors';
import { shieldContent } from '../../domain/shieldContent';
import { sessionCopy as c } from '../../content/sessions';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
export function ShieldPreview({ onOpen, onClose }: { onOpen: () => void; onClose: () => void }) {
  const [cause, setCause] = useState<'locked' | 'lockWindow' | 'walkingEnded'>('locked'),
    decision = useLockDecision(),
    content = shieldContent(cause, decision.state === 'locked' ? decision.nextUnlockHint : undefined);
  return (
    <ScreenShell
      tinted={false}
      footer={
        <>
          <PrimaryButton label={content.primary} onPress={onOpen} />
          <SecondaryButton label={content.secondary} onPress={onClose} />
        </>
      }>
      <SegmentedControl options={c.causes} value={cause} onChange={(v) => setCause(v as typeof cause)} />
      <LivingIcon name="lock" />
      <Reveal key={cause}>
        <Heading title={content.title} centered />
        <Label style={{ textAlign: 'center' }}>{content.subtitle}</Label>
      </Reveal>
    </ScreenShell>
  );
}
