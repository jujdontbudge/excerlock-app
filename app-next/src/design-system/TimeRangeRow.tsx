import Animated from 'react-native-reanimated';
import { layoutTransition } from '../motion/presets';
import { Switch, View } from 'react-native';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { controls } from '../content/controls';
import { Reveal } from '../motion/Reveal';
import { feedback } from '../motion/haptics';
export function TimeRangeRow({
  start,
  end,
  allDay,
  onAllDay,
  onChoose,
  compact = false,
}: {
  start: string;
  end: string;
  allDay: boolean;
  onAllDay: (value: boolean) => void;
  onChoose: (which: 'start' | 'end') => void;
  compact?: boolean;
}) {
  return (
    <Animated.View layout={layoutTransition} style={{ gap: compact ? t.space.sm : t.space.lg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <Label>{controls.allDay}</Label>
        <Switch
          accessibilityRole="switch"
          accessibilityLabel={controls.allDay}
          value={allDay}
          onValueChange={(v) => {
            feedback();
            onAllDay(v);
          }}
          trackColor={{ true: t.brand.primary, false: t.border.default }}
        />
      </View>
      {!allDay ? (
        <Reveal style={{ flexDirection: 'row', gap: t.space.md }}>
          {(['start', 'end'] as const).map((key) => (
            <View key={key} style={{ flex: 1 }}>
              <PressableScale
                label={`${controls[key]}: ${key === 'start' ? start : end}`}
                onPress={() => onChoose(key)}
                style={{
                  padding: compact ? t.space.sm : t.space.lg,
                  gap: t.space.xs,
                  backgroundColor: t.surface.subtle,
                  borderRadius: t.radius.field,
                }}>
                <Label variant="support" tone="secondary">
                  {controls[key]}
                </Label>
                <Label variant="label">{key === 'start' ? start : end}</Label>
              </PressableScale>
            </View>
          ))}
        </Reveal>
      ) : null}
    </Animated.View>
  );
}
