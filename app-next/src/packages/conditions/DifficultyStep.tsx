import { View } from 'react-native';
import { Heading, Label } from '../ui';
import { DifficultyCards } from '../ui/DifficultyCards';
import { tokens as t } from '../ui/tokens';
import type { RuleDraft } from './draft';
import { bankDailyCost, bankPrice, difficultyLabels } from './bankCopy';
const levels = ['easy', 'medium', 'hard'] as const;
export function DifficultyStep({
  activity,
  difficulty,
  onChange,
  title,
  support,
  screenMinutes,
  note,
}: {
  activity: RuleDraft['activity'];
  difficulty: RuleDraft['difficulty'];
  onChange: (difficulty: RuleDraft['difficulty']) => void;
  title: string;
  support?: string;
  screenMinutes?: number;
  note?: string;
}) {
  const options = levels.map((id) => ({
    id,
    title: difficultyLabels[id],
    trade: bankPrice(activity, id),
  }));
  const footnote = note ?? (screenMinutes ? bankDailyCost(activity, difficulty, screenMinutes) : undefined);
  return (
    <View style={{ gap: t.space.xl }}>
      <Heading title={title} support={support} centered />
      <DifficultyCards options={options} value={difficulty} onChange={onChange} />
      {footnote ? (
        <Label variant={note ? 'support' : 'label'} tone={note ? 'secondary' : 'primary'} style={{ textAlign: 'center' }}>
          {footnote}
        </Label>
      ) : null}
    </View>
  );
}
