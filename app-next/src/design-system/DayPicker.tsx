import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { controls } from '../content/controls';
import { weekOrder } from '../content/locale';
/** `controls.days` is Monday-first; a day number (Sunday = 0) maps onto it through this shift. */
const mondayIndex = (day: number) => (day + 6) % 7;
export function DayPicker({ days, onChange }: { days: number[]; onChange: (days: number[]) => void }) {
  const order = weekOrder();
  return (
    <View style={{ gap: t.space.md }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {order.map((d) => (
          <PressableScale
            key={d}
            label={controls.days[mondayIndex(d)]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: days.includes(d) }}
            onPress={() => onChange(order.filter((day) => (day === d ? !days.includes(d) : days.includes(day))))}
            style={{ minWidth: t.layout.touch, alignItems: 'center' }}>
            <Animated.View
              style={{
                width: t.layout.disc,
                height: t.layout.disc,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: t.radius.pill,
                backgroundColor: days.includes(d) ? t.brand.primary : t.surface.subtle,
                transitionProperty: 'backgroundColor',
                transitionDuration: t.motion.duration.standard,
              }}>
              <Label
                variant="support"
                style={{
                  color: days.includes(d) ? t.text.onAccent : t.text.primary,
                }}>
                {controls.dayLetters[mondayIndex(d)]}
              </Label>
            </Animated.View>
          </PressableScale>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: t.space.xl }}>
        <PressableScale label={controls.weekdays} onPress={() => onChange([1, 2, 3, 4, 5])}>
          <Label variant="support" style={{ color: t.brand.primary }}>
            {controls.weekdays}
          </Label>
        </PressableScale>
        <PressableScale label={controls.everyDay} onPress={() => onChange(order)}>
          <Label variant="support" style={{ color: t.brand.primary }}>
            {controls.everyDay}
          </Label>
        </PressableScale>
      </View>
    </View>
  );
}
