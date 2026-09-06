import { Heading, Label } from '../../design-system';
import { legalCopy } from '../../content/legal';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { tokens as t } from '../../design-system/tokens';
export function LegalScreen({ doc }: { doc: 'privacy' | 'terms' }) {
  const c = legalCopy[doc];
  return (
    <>
      <Heading title={c.title} />
      <LivingIcon name="shield" />
      {c.sections.map((s, i) => (
        <Reveal key={s.title} index={i} style={{ gap: t.space.md }}>
          <Label variant="section" accessibilityRole="header">
            {s.title}
          </Label>
          <Label>{s.body}</Label>
        </Reveal>
      ))}
    </>
  );
}
