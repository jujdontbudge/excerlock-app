import { View } from 'react-native';
import { LineChart, Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { LivingIcon } from '../../../motion/LivingIcon';
import { Reveal } from '../../../motion/Reveal';
import { onboardingLabels as c } from '../../../content/onboarding';
const exercise = [1, 2, 2.5, 4, 5, 7],
  screenTime = [8, 7, 6, 4, 3, 2];
export function TrendHero() {
  return (
    <View style={{ gap: t.space.xl }}>
      <LivingIcon name="chart" />
      <LineChart
        label={c.illustrative}
        values={exercise}
        comparison={screenTime}
        startLabel={c.today}
        endLabel={c.future}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: t.space.xl }}>
        <Reveal index={2}>
          <Label tone="secondary">{c.screenTime}</Label>
        </Reveal>
        <Reveal index={3}>
          <Label style={{ color: t.brand.primary }}>{c.exercise}</Label>
        </Reveal>
      </View>
      <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
        {c.illustrative}
      </Label>
    </View>
  );
}
