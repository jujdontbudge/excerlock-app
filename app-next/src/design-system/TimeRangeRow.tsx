import Animated from 'react-native-reanimated';
import { layoutTransition } from '../motion/presets';
import { Switch, View } from 'react-native';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { controls } from '../content/controls';
import { feedback } from '../motion/haptics';
const iosGreen = '#34C759';
const iosGrouped = '#F2F2F7';
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
  return (
    <Animated.View layout={layoutTransition} style={{ gap: t.space.sm }}>
      <Label variant="support" tone="secondary">
        {controls.timeOfUse}
      </Label>
      <View
        style={{
          backgroundColor: t.surface.card,
          borderRadius: t.radius.field,
          borderWidth: t.stroke.hairline,
          borderColor: t.border.default,
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
            onValueChange={(v) => {
              feedback();
              onAllDay(v);
            }}
            trackColor={{ true: iosGreen, false: t.border.default }}
          />
        </View>
        {!allDay ? (
          <>
            <View style={{ height: t.stroke.hairline, backgroundColor: t.border.default, marginLeft: t.space.lg }} />
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
                    backgroundColor: iosGrouped,
                    borderRadius: t.radius.pill,
                    paddingHorizontal: t.space.lg,
                    paddingVertical: t.space.sm,
                  }}>
                  <Label variant="label">{start}</Label>
                </View>
              </View>
            </PressableScale>
            <View style={{ height: t.stroke.hairline, backgroundColor: t.border.default, marginLeft: t.space.lg }} />
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
                    backgroundColor: iosGrouped,
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
