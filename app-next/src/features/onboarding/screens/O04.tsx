import { tokens as t } from '../../../design-system/tokens';
import { Heading, TextField } from '../../../design-system';
import { LivingIcon } from '../../../motion/LivingIcon';
import { Reveal } from '../../../motion/Reveal';
import { onboardingCopy, onboardingLabels as c } from '../../../content/onboarding';
import { AnswerProps } from '../types';
export function O04({ answers, setAnswer }: AnswerProps) {
  const name = String(answers.name ?? '');
  return (
    <>
      <LivingIcon name="person" size={t.space.hero} />
      <Heading title={onboardingCopy.O04.title} support={onboardingCopy.O04.body} />
      <Reveal index={1}>
        <TextField
          label={c.name}
          autoFocus
          autoComplete="given-name"
          textContentType="givenName"
          returnKeyType="done"
          value={name}
          onChangeText={(value) => setAnswer('name', value)}
          error={name.trim().length > 30 ? c.nameError : undefined}
        />
      </Reveal>
    </>
  );
}
