import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { welcomeCopy as c } from '../../../content/welcome';
import { useMotion } from '../../../motion/useMotion';
import { Reveal } from '../../../motion/Reveal';
const p = w.progress;
export function ProgressBadge() {
  const m = useMotion();
  return (
    <Reveal
      index={4}
      style={{ position: 'absolute', top: p.badge.top, alignSelf: 'center', alignItems: 'center', gap: t.space.xs }}>
      <Animated.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.sm,
          padding: t.space.xs,
          paddingRight: p.badge.padding,
          minHeight: p.badge.minHeight,
          borderRadius: t.radius.pill,
          backgroundColor: w.brands.white,
          boxShadow: p.badge.shadow,
          animationName: m.reduced
            ? undefined
            : {
                from: { transform: [{ translateY: 0 }] },
                '50%': { transform: [{ translateY: -m.distance.float }] },
                to: { transform: [{ translateY: 0 }] },
              },
          animationDuration: m.duration.breathe,
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        }}>
        <View
          style={{
            width: p.badge.icon,
            height: p.badge.icon,
            borderRadius: t.radius.pill,
            backgroundColor: p.orange,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Svg width={p.badge.arrow} height={p.badge.arrow} viewBox="0 0 24 24" accessible={false}>
            <Path
              d="M5 5L19 19M19 7V19H7"
              fill="none"
              stroke={w.brands.white}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <Label style={{ color: p.deep, fontSize: p.badge.fontSize, lineHeight: p.badge.lineHeight, fontWeight: '600' }}>
          {c.progressValue}
        </Label>
      </Animated.View>
      <Label variant="support" tone="secondary">
        {c.illustrative}
      </Label>
    </Reveal>
  );
}
