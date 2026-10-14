import { View } from 'react-native';
import { Heading, Label, PressableScale } from '../ui';
import { tokens as t } from '../ui/tokens';
import type { RuleDraft } from './draft';
import { bankTrade, difficultyLabels } from './bankCopy';
export function DifficultyStep({
  activity,
  difficulty,
  onChange,
  title,
  support,
}: {
  activity: RuleDraft['activity'];
  difficulty: RuleDraft['difficulty'];
  onChange: (difficulty: RuleDraft['difficulty']) => void;
  title: string;
  support?: string;
}) {
  return (
    <View style={{ gap: t.space.lg }}>
      <Heading title={title} support={support} centered />
      {(['easy', 'medium', 'hard'] as const).map((value) => (
        <PressableScale
          key={value}
          label={`${difficultyLabels[value]} · ${bankTrade(activity, value)}`}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === difficulty }}
          onPress={() => onChange(value)}
          style={{
            alignItems: 'center',
            padding: t.space.lg,
            borderRadius: t.radius.card,
            backgroundColor: value === difficulty ? t.brand.primary : t.surface.softChoice,
          }}>
          <Label variant="label" style={{ textAlign: 'center', color: value === difficulty ? t.text.onAccent : t.text.primary }}>
            {`${difficultyLabels[value]}\n${bankTrade(activity, value)}`}
          </Label>
        </PressableScale>
      ))}
    </View>
  );
}
