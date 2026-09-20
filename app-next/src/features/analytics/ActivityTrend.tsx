import { StyleSheet, View } from 'react-native';
import { LineChart } from '../../design-system/LineChart';
import { tokens as t } from '../../design-system/tokens';

export function ActivityTrend({ label, values, startLabel, endLabel }: {
  label: string;
  values: readonly number[];
  startLabel: string;
  endLabel: string;
}) {
  return (
    <View style={s.card}>
      <LineChart label={label} values={values} startLabel={startLabel} endLabel={endLabel} />
    </View>
  );
}
const s = StyleSheet.create({
  card: { backgroundColor: t.surface.card, borderWidth: t.stroke.hairline, borderColor: t.border.outline,
    borderRadius: t.radius.card, padding: t.space.lg },
});
