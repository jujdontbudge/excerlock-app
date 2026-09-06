import { useMemo, useState } from 'react';
import { Switch, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { Icon, IconName } from '../icons/Icon';
import { PressableScale } from './PressableScale';
import { controls } from '../content/controls';
import { feedback } from '../motion/haptics';
export function RuleCard({
  title,
  schedule,
  icon,
  enabled,
  onOpen,
  onToggle,
  onDelete,
}: {
  title: string;
  schedule: string;
  icon: IconName;
  enabled: boolean;
  onOpen: () => void;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const x = useSharedValue(0),
    start = useSharedValue(0),
    [opened, setOpened] = useState(false);
  const reveal = t.space.hero + t.space.lg;
  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-t.space.md, t.space.md])
        .failOffsetY([-t.space.md, t.space.md])
        .onBegin(() => {
          start.set(x.get());
        })
        .onUpdate((e) => {
          x.set(Math.min(0, Math.max(-reveal, start.get() + e.translationX)));
        })
        .onEnd(() => {
          const open = x.get() < -reveal / 2;
          x.set(withSpring(open ? -reveal : 0, t.motion.spring.control));
          scheduleOnRN(setOpened, open);
        }),
    [x, start, reveal],
  );
  const offset = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }],
  }));
  return (
    <View
      style={{
        borderRadius: t.radius.card,
        overflow: 'hidden',
        backgroundColor: t.state.error,
      }}>
      <View
        accessibilityElementsHidden={!opened}
        importantForAccessibility={opened ? 'auto' : 'no-hide-descendants'}
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: reveal,
          justifyContent: 'center',
        }}>
        <PressableScale label={controls.remove} onPress={onDelete} style={{ alignItems: 'center' }}>
          <Icon name="trash" variant="utility" tint={t.text.onAccent} size={t.layout.glyph} />
          <Label variant="support" tone="onAccent">
            {controls.remove}
          </Label>
        </PressableScale>
      </View>
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[
            {
              backgroundColor: t.surface.card,
              borderColor: t.border.default,
              borderWidth: t.stroke.hairline,
              borderRadius: t.radius.card,
              padding: t.space.lg,
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space.md,
            },
            offset,
          ]}>
          <View style={{ flex: 1 }}>
            <PressableScale
              label={title}
              onPress={onOpen}
              accessibilityActions={[{ name: 'delete', label: controls.remove }]}
              onAccessibilityAction={(e) => {
                if (e.nativeEvent.actionName === 'delete') onDelete();
              }}
              style={{
                flexDirection: 'row',
                gap: t.space.md,
                alignItems: 'center',
              }}>
              <Icon name={icon} />
              <View style={{ flex: 1, gap: t.space.xs }}>
                <Label variant="label">{title}</Label>
                <Label variant="support" tone="secondary">
                  {schedule}
                </Label>
              </View>
            </PressableScale>
          </View>
          <Switch
            accessibilityLabel={title}
            value={enabled}
            onValueChange={(v) => {
              feedback();
              onToggle(v);
            }}
            trackColor={{ true: t.brand.primary, false: t.border.default }}
          />
          <Icon name="chevron" variant="utility" size={t.space.lg} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
