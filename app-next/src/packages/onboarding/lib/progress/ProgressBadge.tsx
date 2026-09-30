import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated from 'react-native-reanimated';
import { Label } from '../../../ui';
import { tokens as t } from '../../../ui/tokens';
import { illustrationTokens as art } from '../../../ui/illustrationTokens';
import { welcomeCopy as c } from '../welcomeCopy';
import { useMotion } from '../../../ui/useMotion';
import { Reveal } from '../../../ui/Reveal';
const p = art.welcome.progress;
export function ProgressBadge() {
  const m = useMotion();
  return (
    <Reveal index={4} style={{ position: 'absolute', top: p.badge.top, alignSelf: 'center' }}>
      <Animated.View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.sm,
          padding: t.space.xs,
          paddingRight: p.badge.padding,
          minHeight: p.badge.minHeight,
          borderRadius: t.radius.pill,
          backgroundColor: art.welcome.brands.white,
          boxShadow: p.badge.shadow,
          ...m.keyframes(
            {
              from: { transform: [{ translateY: 0 }] },
              '50%': { transform: [{ translateY: -m.distance.float }] },
              to: { transform: [{ translateY: 0 }] },
            },
            'breathe',
            { loop: true },
          ),
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
              stroke={art.welcome.brands.white}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </View>
        <Label
          style={{
            ...p.badge.text,
            color: p.deep,
            alignSelf: 'center',
            transform: [{ translateY: p.badge.text.fontSize * t.optical.centre }],
          }}>
          {c.progressValue}
        </Label>
      </Animated.View>
    </Reveal>
  );
}
