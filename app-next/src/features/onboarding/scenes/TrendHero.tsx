import { View } from 'react-native';
import { Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { Icon } from '../../../icons/Icon';
import { Reveal } from '../../../motion/Reveal';
import { onboardingLabels as c } from '../../../content/onboarding';
import { trendCopy } from '../../../content/trend';
import { TrendCurves } from './TrendCurves';
export function TrendHero() {
  return (
    <View style={{ gap: t.space.xl }}>
      <Reveal>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={trendCopy.description}
          style={{ paddingVertical: t.space.lg }}>
          <View style={{ width: '100%', aspectRatio: 320 / 240 }}>
            <TrendCurves />
            <View
              style={{
                position: 'absolute',
                right: 0,
                top: '0%',
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.xs,
              }}>
              <Icon name="walking" size={t.icon.lg} tint={t.brand.primary} />
              <Label variant="label" style={{ color: t.text.primary }}>
                {c.exercise}
              </Label>
            </View>
            <View
              style={{
                position: 'absolute',
                right: 0,
                top: '58%',
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.xs,
              }}>
              <Icon name="phone" size={t.icon.md} tint={t.text.secondary} />
              <Label variant="label" tone="secondary">
                {c.screenTime}
              </Label>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: t.space.xl }}>
            <Label variant="label" tone="secondary">
              {trendCopy.now}
            </Label>
            <Label variant="label" tone="secondary">
              {trendCopy.future}
            </Label>
          </View>
        </View>
      </Reveal>
    </View>
  );
}
