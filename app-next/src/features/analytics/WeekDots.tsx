import { View, StyleSheet } from 'react-native';
import { Label } from '../../design-system';
import { Icon } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';
import { analyticsCopy as c } from '../../content/analytics';
export type WeekDot = { label: string; met: boolean; scheduled: boolean; today: boolean; future: boolean };
/** Mon–Sun row: orange check on met days, black ring on today, grey ring elsewhere. */
export function WeekDots({ days }: { days: WeekDot[] }) {
  return (
    <View accessibilityLabel={c.weekDots} style={s.card}>
      {days.map((d) => (
        <View
          key={d.label}
          accessible
          accessibilityLabel={`${d.label}: ${d.met ? 'met' : d.future ? 'upcoming' : d.scheduled ? 'not met' : 'no condition'}`}
          style={s.day}>
          <Label variant="badge" tone={d.today ? 'primary' : 'secondary'}>
            {d.label.slice(0, 1)}
          </Label>
          <View
            style={[
              s.dot,
              d.met
                ? { backgroundColor: t.brand.primary, borderColor: t.brand.primary }
                : d.today
                  ? { borderColor: t.border.outline }
                  : d.future || !d.scheduled
                    ? { borderColor: t.chart.grid }
                    : { borderColor: t.text.muted },
            ]}>
            {d.met ? <Icon name="check" variant="utility" size={16} tint={t.text.onAccent} /> : null}
          </View>
        </View>
      ))}
    </View>
  );
}
const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: t.radius.card,
    borderWidth: t.stroke.hairline,
    borderColor: t.border.outline,
    backgroundColor: t.surface.glass,
    paddingVertical: t.space.lg,
    paddingHorizontal: t.space.md,
  },
  day: { alignItems: 'center', gap: t.space.sm, flex: 1 },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
