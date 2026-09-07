import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens as t } from '../../../design-system/tokens';
import { useMotion } from '../../../motion/useMotion';
import { impactCopy as c } from '../../../content/impact';
import { dotState, impactSummary } from './model';
import { impactTiming as timing } from './timing';
export function ImpactDots({ step, minutes }: { step: string; minutes: number }) {
  const m = useMotion(),
    summary = impactSummary(minutes);
  const label =
    step === 'O12'
      ? c.year
      : step === 'O13'
        ? c.free(summary.freeDays)
        : c.scrolling(summary.scrollingDots, summary.freeDays);
  return (
    <View accessible accessibilityLabel={label} style={{ width: '100%', aspectRatio: 1 }}>
      {Array.from({ length: 365 }, (_, index) => {
        const state = dotState(index, step, summary);
        return (
          <Animated.View
            key={index}
            style={{
              position: 'absolute',
              left: `${(index % 20) * 5}%`,
              top: `${Math.floor(index / 20) * 5}%`,
              width: '2.4%',
              aspectRatio: 1,
              borderRadius: t.radius.pill,
              backgroundColor: state.scrolling ? t.brand.primary : t.chart.comparison,
              opacity: state.visible ? 1 : 0,
              transform: [{ translateY: step === 'O12' ? 0 : -t.space.huge }, { scale: state.visible ? 1 : 0.4 }],
              transitionProperty: ['opacity', 'transform', 'backgroundColor'],
              transitionDuration: m.reduced ? 0 : step === 'O14' ? timing.fade : timing.collapse,
              transitionDelay: m.reduced
                ? 0
                : step === 'O14'
                  ? state.order * timing.dotColor
                  : (index % 20) * m.duration.frame,
            }}
          />
        );
      })}
    </View>
  );
}
