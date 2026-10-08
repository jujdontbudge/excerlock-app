import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { opacityIn } from '../../ui/presets';
import { Label } from '../../ui';
import { tokens as t } from '../../ui/tokens';
import { useMotion } from '../../ui/useMotion';

export function MonthGrid({ data, goal, unit }: {
  data: { day: string; value: number | null }[];
  goal: number | null;
  unit: string;
}) {
  const motion = useMotion();
  const leading = data.length ? new Date(`${data[0].day}T12:00:00Z`).getUTCDay() : 0;
  return (
    <View accessible accessibilityLabel="Monthly activity calendar" style={s.card}>
      <View style={s.row}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
          <View key={`${label}-${index}`} style={s.cell}><Label variant="micro" tone="secondary">{label}</Label></View>
        ))}
      </View>
      <View style={s.grid}>
        {Array.from({ length: leading }).map((_, index) => <View key={`blank-${index}`} style={s.cell} />)}
        {data.map((point, index) => {
          const value = point.value ?? 0;
          const met = goal !== null && goal > 0 && value >= goal;
          const measured = point.value !== null;
          return (
            <Animated.View
              key={point.day}
              entering={motion.reduced ? undefined : opacityIn('standard', index * t.motion.stagger.dot)}
              accessible
              accessibilityLabel={`${point.day}: ${point.value === null ? 'no measurement' : `${Math.round(value).toLocaleString('en-US')} ${unit}`}`}
              style={s.cell}>
              <View style={[s.day, measured && s.measured, met && s.met]}>
                <Label variant="micro" style={{ color: met ? t.text.onAccent : t.text.primary }}>
                  {Number(point.day.slice(-2))}
                </Label>
              </View>
            </Animated.View>
          );
        })}
      </View>
      <View style={s.legend}>
        <View style={[s.dot, s.measured]} />
        <Label variant="support" tone="secondary">Measured</Label>
        {goal === null ? null : (
          <>
            <View style={[s.dot, s.met]} />
            <Label variant="support" tone="secondary">Goal met</Label>
          </>
        )}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: t.surface.softChoice, borderRadius: t.radius.card,
    borderWidth: t.stroke.hairline, borderColor: t.surface.transparent, padding: t.space.md, gap: t.space.sm },
  row: { flexDirection: 'row' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: t.space.xs },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center' },
  day: { width: 32, height: 32, borderRadius: t.radius.pill, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.surface.well },
  measured: { borderWidth: t.stroke.selected, borderColor: t.brand.primary, backgroundColor: t.surface.selected },
  met: { backgroundColor: t.brand.primary, borderColor: t.brand.primary },
  legend: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  dot: { width: 10, height: 10, borderRadius: t.radius.pill },
});
