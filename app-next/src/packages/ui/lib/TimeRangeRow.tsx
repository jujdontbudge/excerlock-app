import Animated from 'react-native-reanimated';
import { layoutTransition } from '../presets';
import { Switch, View } from 'react-native';
import { tokens as t } from '../tokens';
import { Label } from '../Label';
import { PressableScale } from '../PressableScale';
import { controls } from '../controlsCopy';
import { useMotion } from '../useMotion';

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
  void compact;
  const m = useMotion();
  return (
    <Animated.View layout={layoutTransition(m.reduced)} style={{ gap: t.space.sm }}>
      <Label variant="support" tone="secondary">
        {controls.timeOfUse}
      </Label>
      <View
        style={{
          backgroundColor: t.surface.softChoice,
          borderRadius: t.radius.field,
          borderWidth: t.stroke.hairline,
          borderColor: t.surface.transparent,
          overflow: 'hidden',
        }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: t.space.lg,
            paddingVertical: t.space.md,
          }}>
          <Label>{controls.allDay}</Label>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel={controls.allDay}
            value={allDay}
            onValueChange={onAllDay}
            trackColor={{ true: t.state.switchOn, false: t.border.divider }}
          />
        </View>
        {!allDay ? (
          <>
            <View style={{ height: t.stroke.hairline, backgroundColor: t.border.divider, marginLeft: t.space.lg }} />
            <PressableScale
              label={`${controls.start}: ${start}`}
              onPress={() => onChoose('start')}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: t.space.lg,
                  paddingVertical: t.space.md,
                }}>
                <Label>{controls.start}</Label>
                <View
                  style={{
                    backgroundColor: t.surface.well,
                    borderRadius: t.radius.pill,
                    paddingHorizontal: t.space.lg,
                    paddingVertical: t.space.sm,
                  }}>
                  <Label variant="label">{start}</Label>
                </View>
              </View>
            </PressableScale>
            <View style={{ height: t.stroke.hairline, backgroundColor: t.border.divider, marginLeft: t.space.lg }} />
            <PressableScale label={`${controls.end}: ${end}`} onPress={() => onChoose('end')}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: t.space.lg,
                  paddingVertical: t.space.md,
                }}>
                <Label>{controls.end}</Label>
                <View
                  style={{
                    backgroundColor: t.surface.well,
                    borderRadius: t.radius.pill,
                    paddingHorizontal: t.space.lg,
                    paddingVertical: t.space.sm,
                  }}>
                  <Label variant="label">{end}</Label>
                </View>
              </View>
            </PressableScale>
          </>
        ) : null}
      </View>
    </Animated.View>
  );
}
