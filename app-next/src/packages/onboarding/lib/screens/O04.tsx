import { Reveal } from '../../../ui/Reveal';
import { AnswerProps } from '../types';
import { ProfileHeading } from '../profile/ProfileHeading';
import { NameField } from '../profile/NameField';
export function O04({ answers, setAnswer }: AnswerProps) {
  return (
    <>
      <ProfileHeading step="O04" />
      <Reveal index={1}>
        <NameField value={String(answers.name ?? '')} onChange={(value) => setAnswer('name', value)} />
      </Reveal>
    </>
  );
}
