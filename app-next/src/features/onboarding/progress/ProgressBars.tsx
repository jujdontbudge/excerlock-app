import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { illustrationTokens as art } from '../../../design-system/illustrationTokens';
import { useMotion } from '../../../motion/useMotion';
const p = art.welcome.progress;
export function ProgressBars() {
  const m = useMotion();
  return p.bars.map((height, i) => (
    <Animated.View
      key={i}
      style={{
        position: 'absolute',
        left: p.barLeft + i * (p.barWidth + p.barGap),
        top: p.barBottom - height,
        width: p.barWidth,
        height,
        transformOrigin: 'bottom',
        ...m.keyframes(
          { from: { opacity: 0, transform: [{ scaleY: 0.15 }] }, to: { opacity: 1, transform: [{ scaleY: 1 }] } },
          'emphasized',
          { delay: i * m.stagger.hero, fill: 'both', still: { from: { opacity: 0 }, to: { opacity: 1 } } },
        ),
      }}>
      <LinearGradient
        colors={[p.pale, p.pale, art.welcome.brands.white]}
        locations={[0, 0.35, 1]}
        style={{ flex: 1, borderRadius: p.barRadius }}
      />
    </Animated.View>
  ));
}
