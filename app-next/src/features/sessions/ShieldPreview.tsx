import { useState } from 'react';
import { ScreenShell, Heading, Label, PrimaryButton, SecondaryButton, SegmentedControl } from '../../design-system';
import { useLockDecision, useTodayProgress } from '../../state/selectors';
import { shieldContent } from '../../domain/shieldContent';
import { unlockHint } from '../../domain/unlockHint';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { sessionCopy as c } from '../../content/sessions';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
export function ShieldPreview({ onOpen, onClose }: { onOpen: () => void; onClose: () => void }) {
  const [cause, setCause] = useState<'locked' | 'lockWindow' | 'walkingEnded'>('locked'),
    decision = useLockDecision(),
    progress = useTodayProgress(),
    canNotify = usePermissionsStore((state) => state.data.notifications) === 'granted',
    previewHint = progress.length
      ? unlockHint(
          progress.map(({ rule }) => rule),
          progress.map(({ row }) => row),
        )
      : undefined,
    content = shieldContent({
      cause,
      hint: decision.state === 'locked' ? decision.nextUnlockHint : previewHint,
      goal: progress.some(({ row }) => row.met) ? 'met' : 'pending',
      canNotify,
    });
  return (
    <ScreenShell
      footer={
        <>
          <PrimaryButton label={content.primary} onPress={onOpen} />
          {content.secondary ? <SecondaryButton label={content.secondary} onPress={onClose} /> : null}
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
