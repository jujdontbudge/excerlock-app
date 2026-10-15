import { useWindowDimensions, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { opacityIn } from './presets';
import { rewards } from './rewardsCopy';
import { tokens as t } from './tokens';
import { useMotion } from './useMotion';

export type DifficultyOption<Id extends string> = { id: Id; title: string; trade: string; detail?: string };

const settle = LinearTransition.springify()
  .mass(t.motion.spring.settle.mass)
  .stiffness(t.motion.spring.settle.stiffness)
  .damping(t.motion.spring.settle.damping);

// The bars' ink reaches the top of their box, while the last line keeps line-box space under its capitals.
// Matching that space above the bars centres the card's ink by construction (ADR 0065).
const capSlack = (variant: keyof typeof t.type, scale: number) =>
  ((t.type[variant].lineHeight - t.fontMetrics.capHeight * t.type[variant].fontSize) / 2) * scale;

function TierBars({ tier, solid }: { tier: number; solid: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: t.space.xs }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: t.space.xs + t.space.xs / 2,
            height: t.space.sm + i * t.space.xs,
            borderRadius: t.radius.pill,
            backgroundColor:
              i <= tier ? (solid ? t.text.onAccent : t.brand.primary) : solid ? t.border.onAccent : t.border.divider,
          }}
        />
      ))}
    </View>
  );
}

export function DifficultyCards<Id extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly DifficultyOption<Id>[];
  value: Id;
  onChange: (id: Id) => void;
}) {
  const m = useMotion();
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(fontScale, t.a11y.textScale);
  return (
    <View accessibilityRole="radiogroup" style={{ gap: t.space.md }}>
      {options.map((option, tier) => {
        const selected = option.id === value;
        const tone = selected ? 'onAccent' : 'primary';
        const last = selected && option.detail ? 'support' : 'label';
        return (
          <Animated.View key={option.id} layout={m.reduced ? undefined : settle}>
            <PressableScale
              label={rewards.difficulty(option.title, option.trade)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              haptic={selected ? 'none' : 'select'}
              onPress={() => onChange(option.id)}>
              <Animated.View
                style={{
                  paddingVertical: selected ? t.space.xl : t.space.lg,
                  paddingHorizontal: t.space.xl,
                  borderRadius: t.radius.card,
                  backgroundColor: selected ? t.brand.primary : t.surface.softChoice,
                  alignItems: 'center',
                  gap: t.space.xs,
                  ...m.transition(['backgroundColor', 'paddingVertical'], 'standard'),
                }}>
                <View style={{ paddingTop: capSlack(last, scale) }}>
                  <TierBars tier={tier} solid={selected} />
                </View>
                <Label variant="section" tone={tone}>
                  {option.title}
                </Label>
                <Label variant="label" tone={tone} style={{ textAlign: 'center' }}>
                  {option.trade}
                </Label>
                {selected && option.detail ? (
                  <Animated.View entering={opacityIn('standard', t.motion.stagger.list)}>
                    <Label variant="support" tone="onAccent" style={{ textAlign: 'center' }}>
                      {option.detail}
                    </Label>
                  </Animated.View>
                ) : null}
              </Animated.View>
            </PressableScale>
          </Animated.View>
        );
      })}
    </View>
  );
}
