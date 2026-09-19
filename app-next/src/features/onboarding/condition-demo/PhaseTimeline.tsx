import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { tokens as t } from '../../../design-system/tokens';
import { advanceDemo, DemoState, initialDemo, phasesFor, Scenario, snapshot } from './model';
function Segment({
  clock,
  start,
  duration,
  label,
  onPress,
}: {
  clock: SharedValue<DemoState>;
  start: number;
  duration: number;
  label: string;
  onPress: () => void;
}) {
  const fill = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, (clock.value.time - start) / duration)) * 100}%`,
    opacity: clock.value.manual ? 0.55 : 1,
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Preview ${label}`}
      hitSlop={{ top: 17, bottom: 17 }}
      onPress={onPress}
      style={[styles.segment, { flex: duration }]}>
      <Animated.View style={[styles.fill, fill]} />
    </Pressable>
  );
}
export function PhaseTimeline({
  clock,
  scenario,
  onSeek,
}: {
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  onSeek: (frame: ReturnType<typeof snapshot>) => void;
}) {
  const manual = useAnimatedStyle(() => ({
    width: `${clock.value.manual === 'walking' ? Math.min(1, clock.value.manualTime / 3) * 100 : 0}%`,
  }));
  const outline = useAnimatedStyle(() => ({ borderWidth: clock.value.manual ? 2 : 0 }));
  const phases = phasesFor(scenario);
  return (
    <View style={styles.row}>
      {phases.map((phase, index) => {
        const phaseStart = phases.slice(0, index).reduce((sum, previous) => sum + previous.duration, 0);
        return (
          <Segment
            key={phase.name}
            clock={clock}
            start={phaseStart}
            duration={phase.duration}
            label={phase.name}
            onPress={() => {
              const state = advanceDemo(initialDemo(), scenario, phaseStart);
              clock.set(state);
              onSeek(snapshot(state, scenario));
            }}
          />
        );
      })}
      {scenario.kind === 'walk-state' ? (
        <Animated.View accessible={false} style={[styles.segment, { flex: 2.5, borderColor: t.text.primary }, outline]}>
          <Animated.View style={[styles.fill, manual]} />
        </Animated.View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 3 },
  segment: { height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: t.surface.scrim },
  fill: { height: '100%', backgroundColor: t.brand.primary, borderRadius: 4 },
});
