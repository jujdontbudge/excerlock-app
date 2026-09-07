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
          accessibilityLabel={trendCopy.description}
          style={{
            borderRadius: t.radius.sheet,
            backgroundColor: t.surface.card,
            padding: t.space.xl,
            boxShadow: t.shadow.cta,
          }}>
          <View style={{ width: '100%', aspectRatio: 320 / 240 }}>
            <TrendCurves />
            <View
              style={{
                position: 'absolute',
                right: 0,
                top: '3%',
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.xs,
              }}>
              <Icon name="running" size={t.layout.glyph} tint={t.brand.primary} />
              <Label variant="support" style={{ color: t.brand.primary }}>
                {c.exercise}
              </Label>
            </View>
            <View
              style={{
                position: 'absolute',
                right: 0,
                top: '70%',
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.xs,
              }}>
              <Icon name="phone" size={t.space.lg} tint={t.chart.comparison} />
              <Label variant="support" tone="secondary">
                {c.screenTime}
              </Label>
            </View>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: t.space.xl }}>
            <Label variant="support" tone="secondary">
              {trendCopy.now}
            </Label>
            <Label variant="support" tone="secondary">
              {trendCopy.future}
            </Label>
          </View>
        </View>
      </Reveal>
      <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
        {c.illustrative}
      </Label>
    </View>
  );
}
