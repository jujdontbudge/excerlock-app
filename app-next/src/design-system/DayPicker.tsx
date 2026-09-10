import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { controls } from '../content/controls';
const order = [1, 2, 3, 4, 5, 6, 0];
export function DayPicker({ days, onChange }: { days: number[]; onChange: (days: number[]) => void }) {
  const shortcuts = [
    { label: 'Every day', value: order },
    { label: 'Weekdays', value: [1, 2, 3, 4, 5] },
    { label: 'Weekend', value: [6, 0] },
  ];
  return (
    <View style={{ gap: t.space.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm }}>
        {shortcuts.map(({ label, value }) => (
          <PressableScale
            key={label}
            label={label}
            accessibilityRole="button"
            onPress={() => onChange(value)}
            style={{
              minHeight: t.layout.touch,
              justifyContent: 'center',
              paddingHorizontal: t.space.lg,
              borderRadius: t.radius.pill,
              borderWidth: t.stroke.hairline,
              borderColor: t.border.outline,
              backgroundColor: t.surface.card,
            }}>
            <Label variant="support">{label}</Label>
          </PressableScale>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {order.map((d, i) => {
          const selected = days.includes(d);
          return (
            <PressableScale
              key={d}
              label={controls.days[i]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(order.filter((day) => (day === d ? !selected : days.includes(day))))}
              style={{ minWidth: t.layout.touch, alignItems: 'center' }}>
              <Animated.View
                style={{
                  width: t.layout.disc,
                  height: t.layout.disc,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: t.radius.pill,
                  backgroundColor: selected ? t.brand.primary : t.surface.card,
                  borderWidth: selected ? 0 : t.stroke.hairline,
                  borderColor: t.border.default,
                  transitionProperty: 'backgroundColor',
                  transitionDuration: t.motion.duration.standard,
                }}>
                <Label
                  variant="support"
                  style={{
                    color: selected ? t.text.onAccent : t.text.primary,
                  }}>
                  {controls.dayLetters[i]}
                </Label>
              </Animated.View>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
