import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens as t } from '../tokens';
import { Label } from '../Label';
import { PressableScale } from '../PressableScale';
import { controls } from '../controlsCopy';
import { useMotion } from '../useMotion';
const order = [1, 2, 3, 4, 5, 6, 0];
export function DayPicker({ days, onChange }: { days: number[]; onChange: (days: number[]) => void }) {
  const m = useMotion();
  return (
    <View style={{ gap: t.space.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {order.map((d, i) => {
          const selected = days.includes(d);
          return (
            <PressableScale
              key={d}
              label={controls.days[i]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              haptic="select"
              onPress={() => onChange(order.filter((day) => (day === d ? !selected : days.includes(day))))}
              style={{ minWidth: t.control.inline, alignItems: 'center' }}>
              <Animated.View
                style={{
                  width: t.control.inline,
                  height: t.control.inline,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: t.radius.pill,
                  backgroundColor: selected ? t.brand.primary : t.surface.card,
                  borderWidth: selected ? 0 : t.stroke.hairline,
                  borderColor: t.border.outline,
                  ...m.transition('backgroundColor', 'standard'),
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
