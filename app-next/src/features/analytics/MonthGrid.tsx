import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { useMotion } from '../../motion/useMotion';

export function MonthGrid({ data, goal, unit }: {
  data: { day: string; value: number | null }[];
  goal: number;
  unit: string;
}) {
  const motion = useMotion();
  const leading = data.length ? new Date(`${data[0].day}T12:00:00Z`).getUTCDay() : 0;
  return (
    <View accessible accessibilityLabel="Monthly activity calendar" style={s.card}>
      <View style={s.row}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
          <View key={`${label}-${index}`} style={s.cell}><Label variant="badge" tone="secondary">{label}</Label></View>
        ))}
      </View>
      <View style={s.grid}>
        {Array.from({ length: leading }).map((_, index) => <View key={`blank-${index}`} style={s.cell} />)}
        {data.map((point, index) => {
          const value = point.value ?? 0;
          const met = value >= goal && goal > 0;
          const measured = point.value !== null;
          return (
            <Animated.View
              key={point.day}
              entering={motion.reduced ? undefined : FadeIn.delay(index * 18).duration(t.motion.duration.standard)}
              accessible
              accessibilityLabel={`${point.day}: ${point.value === null ? 'no measurement' : `${Math.round(value).toLocaleString('en-US')} ${unit}`}`}
              style={s.cell}>
              <View style={[s.day, measured && s.measured, met && s.met]}>
                <Label variant="badge" style={{ color: t.text.primary }}>{Number(point.day.slice(-2))}</Label>
              </View>
            </Animated.View>
          );
        })}
      </View>
      <View style={s.legend}>
        <View style={[s.dot, s.measured]} />
        <Label variant="support" tone="secondary">Measured</Label>
        <View style={[s.dot, s.met]} />
        <Label variant="support" tone="secondary">Goal met</Label>
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: t.surface.solid, borderRadius: t.radius.card,
    borderWidth: t.stroke.hairline, borderColor: t.border.divider, padding: t.space.lg, gap: t.space.md },
  row: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: t.space.sm },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center' },
  day: { width: 34, height: 34, borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.surface.well },
  measured: { borderWidth: t.stroke.selected, borderColor: t.brand.primary, backgroundColor: t.surface.selected },
  met: { backgroundColor: t.brand.light, borderColor: t.brand.primary },
  legend: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  dot: { width: 12, height: 12, borderRadius: t.radius.pill },
});
