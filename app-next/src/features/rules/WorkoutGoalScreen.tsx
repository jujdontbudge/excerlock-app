import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';
import { NumberField, Label, PressableScale } from '../../design-system';
import { Reveal } from '../../motion/Reveal';
import { tokens as t } from '../../design-system/tokens';
import { workoutCopy as c } from '../../content/workoutRules';
import { RuleDraft, DraftAction } from './draft';
import { goalRange, validGoal } from './goalRange';
import { feedback } from '../../motion/haptics';
const ITEM = 52;
function MinutesWheel({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const options = useMemo(() => {
    const out: number[] = [];
    for (let v = min; v <= max; v += 5) out.push(v);
    return out;
  }, [min, max]);
  const current = Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value / 5) * 5)) : min,
    selected = options.indexOf(current),
    list = useRef<FlatList<number>>(null),
    [active, setActive] = useState(selected);
  useEffect(() => {
    setActive(selected);
  }, [selected]);
  const settle = (y: number) => {
    const index = Math.min(options.length - 1, Math.max(0, Math.round(y / ITEM)));
    setActive(index);
    if (options[index] !== value) {
      feedback();
      onChange(options[index]);
    }
  };
  const scroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => settle(e.nativeEvent.contentOffset.y);
  const step = (delta: number) => {
    const index = Math.min(options.length - 1, Math.max(0, active + delta));
    list.current?.scrollToOffset({ offset: index * ITEM, animated: true });
    setActive(index);
    if (options[index] !== value) {
      feedback();
      onChange(options[index]);
    }
  };
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={c.goal}
      accessibilityValue={{ min, max, now: options[active] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
      <View style={{ height: ITEM * 5, width: 220 }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: ITEM * 2,
            left: 0,
            right: 0,
            height: ITEM,
            backgroundColor: t.surface.card,
            borderRadius: t.radius.field,
            borderWidth: t.stroke.hairline,
            borderColor: t.border.default,
          }}
        />
        <FlatList
          ref={list}
          data={options}
          keyExtractor={(v) => String(v)}
          getItemLayout={(_, index) => ({ length: ITEM, offset: ITEM * index, index })}
          initialScrollIndex={Math.max(0, selected)}
          decelerationRate="fast"
          snapToInterval={ITEM}
          snapToAlignment="start"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: ITEM * 2 }}
          onMomentumScrollEnd={scroll}
          onScrollEndDrag={scroll}
          renderItem={({ item, index }) => {
            const isActive = index === active;
            return (
              <PressableScale label={`${item} ${c.minutes}`} onPress={() => step(index - active)}>
                <View style={{ height: ITEM, alignItems: 'center', justifyContent: 'center' }}>
                  <Label
                    style={{
                      fontSize: isActive ? 26 : 20,
                      lineHeight: isActive ? 32 : 26,
                      fontWeight: isActive ? '700' : '400',
                      color: isActive ? t.text.primary : t.text.muted,
                    }}>
                    {`${item} min`}
                  </Label>
                </View>
              </PressableScale>
            );
          }}
        />
      </View>
    </View>
  );
}
export function WorkoutGoalScreen({
  step,
  draft: d,
  onAction,
}: {
  step: 'G2' | 'R2' | 'B2' | 'D';
  draft: RuleDraft;
  onAction: (a: DraftAction) => void;
}) {
  const distance = step === 'D',
    activity = d.activity === 'walking' ? 'running' : d.activity,
    value = distance ? d.distance : activity === 'gym' ? d.gymMinutes : d.minutes,
    range = goalRange(d, distance),
    unit = distance ? d.unit : c.minutes;
  const change = (value: number) =>
    onAction(
      distance
        ? { type: 'setDistance', value, unit: d.unit }
        : { type: activity === 'gym' ? 'setGymMinutes' : 'setMinutes', value },
    );
  const hint = c.range(...range, unit),
    valid = validGoal(value, range);
  if (distance) {
    return (
      <Reveal index={1} style={{ gap: t.space.xl, paddingTop: t.space.md }}>
        <NumberField
          label={c.distance}
          labelTone="primary"
          min={range[0]}
          max={range[1]}
          step={range[0]}
          value={Number.isNaN(value) ? '' : String(value)}
          unit={unit}
          units={['mi', 'km']}
          onUnitChange={(unit) => onAction({ type: 'setDistance', value, unit: unit as 'mi' | 'km' })}
          onChange={(text) => change(text.trim() ? Number(text.replace(',', '.')) : NaN)}
          error={valid ? undefined : hint}
        />
      </Reveal>
    );
  }
  const minutes = Number.isFinite(value) ? Math.min(range[1], Math.max(range[0], Math.round(value / 5) * 5)) : range[0];
  return (
    <Reveal index={1} style={{ gap: t.space.lg, paddingTop: t.space.md, alignItems: 'center' }}>
      <MinutesWheel value={minutes} min={range[0]} max={range[1]} onChange={change} />
      {!valid ? (
        <Label accessibilityRole="alert" variant="support" style={{ color: t.state.error, textAlign: 'center' }}>
          {hint}
        </Label>
      ) : null}
    </Reveal>
  );
}
