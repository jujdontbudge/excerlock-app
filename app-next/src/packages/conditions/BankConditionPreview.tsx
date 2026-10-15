import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Label } from '../ui';
import { Icon } from '../ui/Icon';
import { Reveal } from '../ui/Reveal';
import { tokens as t } from '../ui/tokens';
import { bankConditionCopy, bankPrice, difficultyLabels } from './bankCopy';
import { conditionPreviewCopy } from './lib/conditionPreviewCopy';
import type { RuleDraft } from './draft';
export function BankConditionPreview({
  activity,
  difficulty,
  caption = true,
}: Pick<RuleDraft, 'activity' | 'difficulty'> & { caption?: boolean }) {
  const price = bankPrice(activity, difficulty);
  return (
    <View style={{ gap: t.space.md }}>
      {caption ? (
        <Label variant="label" style={{ textAlign: 'center' }}>
          {conditionPreviewCopy.caption}
        </Label>
      ) : null}
      <Reveal key={`${activity}:${difficulty}`}>
        <View
          testID="bank-condition-preview"
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`${bankConditionCopy.promise(activity)}. ${difficultyLabels[difficulty]}: ${price} of screen time`}
          style={{ borderRadius: t.radius.card, boxShadow: t.shadow.status }}>
          <LinearGradient
            colors={t.surface.statusGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: t.radius.card,
              overflow: 'hidden',
              minHeight: t.layout.statusCard,
              padding: t.space.xl,
              alignItems: 'center',
              justifyContent: 'center',
              gap: t.space.sm,
            }}>
            <Icon name={activity} variant="utility" tone="onAccent" size={t.icon.lg} />
            <Label variant="label" tone="onAccent" style={{ textAlign: 'center' }}>
              {bankConditionCopy.promise(activity)}
            </Label>
            <Label variant="metricSmall" tone="onAccent" style={{ textAlign: 'center' }}>
              {price}
            </Label>
            <Label variant="support" tone="onAccent" style={{ textAlign: 'center' }}>
              {bankConditionCopy.level(difficulty)}
            </Label>
          </LinearGradient>
        </View>
      </Reveal>
    </View>
  );
}
