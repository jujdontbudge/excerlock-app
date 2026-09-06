import { useState } from 'react';
import { Switch, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated from 'react-native-reanimated';
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
  const [opened, setOpened] = useState(false);
  const reveal = t.space.hero + t.space.lg;
  return (
    <View
      style={{
        borderRadius: t.radius.card,
        overflow: 'hidden',
        backgroundColor: t.state.error,
      }}>
      <Swipeable
        overshootRight={false}
        onSwipeableOpen={() => setOpened(true)}
        onSwipeableClose={() => setOpened(false)}
        renderRightActions={() => (
          <View
            accessibilityElementsHidden={!opened}
            importantForAccessibility={opened ? 'auto' : 'no-hide-descendants'}
            style={{
              backgroundColor: t.state.error,
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
        )}>
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
      </Swipeable>
    </View>
  );
}
