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
export type RuleStatus = { text: string; tone: 'paused' | 'active' | 'met' | 'idle' };
export function RuleCard({
  title,
  schedule,
  icon,
  enabled,
  status,
  onOpen,
  onToggle,
  onDelete,
}: {
  title: string;
  schedule: string;
  icon: IconName;
  enabled: boolean;
  status?: RuleStatus;
  onOpen: () => void;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}) {
  const [opened, setOpened] = useState(false);
  const reveal = t.space.hero + t.space.lg;
  const statusColor = {
    paused: t.text.secondary,
    active: t.brand.primary,
    met: t.state.success,
    idle: t.text.secondary,
  } as const;
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
              flexDirection: 'column',
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
              <View
                testID="rule-card-identity"
                style={{ flexDirection: 'row', gap: t.space.md, alignItems: 'center', flex: 1, opacity: enabled ? 1 : 0.5 }}>
                <Icon name={icon} variant="utility" tint={t.brand.primary} size={t.space.xxl} />
                <View style={{ flex: 1, gap: t.space.xs }}>
                  <Label variant="label">{title}</Label>
                  <Label variant="support" tone="secondary">
                    {schedule}
                  </Label>
                  {status ? (
                    <Label variant="support" style={{ color: statusColor[status.tone] }}>
                      {status.text}
                    </Label>
                  ) : null}
                </View>
              </View>
            </PressableScale>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: t.layout.touch + t.space.sm, height: t.layout.touch, alignItems: 'center', justifyContent: 'center' }}>
          <Switch
            style={{ transform: [{ scale: 0.8 }] }}
            accessibilityRole="switch"
            accessibilityLabel={title}
            value={enabled}
            onValueChange={(v) => {
              feedback();
              onToggle(v);
            }}
            trackColor={{ true: t.brand.primary, false: t.border.default }}
          />
          </View>
          <View style={{ flexDirection: 'row', gap: t.space.sm }}>
            <PressableScale label={`Edit ${title}`} onPress={onOpen} style={{ width: t.layout.touch, alignItems: 'center' }}>
              <Label style={{ fontSize: 28, color: t.brand.primary }}>✎</Label>
            </PressableScale>
            <PressableScale label={controls.remove} onPress={onDelete} style={{ width: t.layout.touch, alignItems: 'center' }}>
              <Icon name="trash" variant="utility" tint={t.brand.primary} size={t.layout.glyph} />
            </PressableScale>
          </View>
          </View>
        </Animated.View>
      </Swipeable>
    </View>
  );
}
