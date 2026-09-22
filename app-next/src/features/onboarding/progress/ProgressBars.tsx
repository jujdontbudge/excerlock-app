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
        animationName: m.reduced
          ? { from: { opacity: 0 }, to: { opacity: 1 } }
          : { from: { opacity: 0, transform: [{ scaleY: 0.15 }] }, to: { opacity: 1, transform: [{ scaleY: 1 }] } },
        animationDuration: m.duration.reveal,
        animationDelay: i * m.stagger.hero,
        animationFillMode: 'both',
      }}>
      <LinearGradient
        colors={[p.pale, p.pale, art.welcome.brands.white]}
        locations={[0, 0.35, 1]}
        style={{ flex: 1, borderRadius: p.barRadius }}
      />
    </Animated.View>
  ));
}
