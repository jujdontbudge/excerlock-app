import { Switch, View, useWindowDimensions } from 'react-native';
import { Icon, IconName } from '../icons/Icon';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { feedback } from '../motion/haptics';
export function SettingsRow({
  title,
  value,
  icon,
  onPress,
  toggle,
  onToggle,
  destructive = false,
}: {
  title: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  toggle?: boolean;
  onToggle?: (value: boolean) => void;
  destructive?: boolean;
}) {
  const stacked = useWindowDimensions().fontScale > 1;
  const content = (
    <View
      style={{
        minHeight: t.layout.row,
        flexDirection: 'row',
        alignItems: 'center',
        padding: t.space.lg,
        gap: t.space.md,
      }}>
      {icon ? <Icon name={icon} size={t.space.xxl} /> : null}
      <View
        style={{
          flex: 1,
          flexDirection: stacked ? 'column' : 'row',
          alignItems: stacked ? 'flex-start' : 'center',
          gap: t.space.sm,
        }}>
        <Label style={{ flex: stacked ? undefined : 1, color: destructive ? t.state.error : t.text.primary }}>
          {title}
        </Label>
        {value ? (
          <Label tone="secondary" variant="support" style={{ flexShrink: 1 }}>
            {value}
          </Label>
        ) : null}
      </View>
      {onToggle ? (
        <Switch
          accessibilityLabel={title}
          value={toggle}
          onValueChange={(v) => {
            feedback();
            onToggle(v);
          }}
          trackColor={{ true: t.brand.primary, false: t.border.default }}
        />
      ) : onPress ? (
        <Icon name="chevron" variant="utility" size={t.space.lg} tint={t.text.muted} />
      ) : null}
    </View>
  );
  return onPress && !onToggle ? (
    <PressableScale label={value ? `${title}, ${value}` : title} onPress={onPress}>
      {content}
    </PressableScale>
  ) : (
    content
  );
}
