import { Switch, View, useWindowDimensions } from 'react-native';
import { Icon, IconName } from '../icons/Icon';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { ValueReveal } from '../motion/ValueReveal';
import { feedback } from '../motion/haptics';
export function SettingsRow({
  title,
  value,
  subtitle,
  icon,
  onPress,
  toggle,
  onToggle,
  destructive = false,
  flat = false,
  iconTint,
}: {
  title: string;
  value?: string;
  subtitle?: string;
  icon?: IconName;
  onPress?: () => void;
  toggle?: boolean;
  onToggle?: (value: boolean) => void;
  destructive?: boolean;
  flat?: boolean;
  iconTint?: string;
}) {
  const fontScale = useWindowDimensions().fontScale;
  const stacked = !!subtitle || fontScale > 1;
  const detail = subtitle ?? value;
  const content = (
    <View
      style={{
        minHeight: t.layout.row,
        flexDirection: 'row',
        alignItems: 'center',
        padding: t.space.lg,
        paddingHorizontal: flat ? 0 : t.space.lg,
        gap: t.space.md,
      }}>
      {icon ? <Icon name={icon} size={t.space.xxl} tint={iconTint} /> : null}
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
        {detail ? (
          <ValueReveal value={detail} style={{ flexShrink: 1 }}>
            <Label tone="secondary" variant="support">
              {detail}
            </Label>
          </ValueReveal>
        ) : null}
      </View>
      {onToggle ? (
        <Switch
          accessibilityRole="switch"
          accessibilityLabel={title}
          value={toggle}
          onValueChange={(v) => {
            feedback();
            onToggle(v);
          }}
          trackColor={{ true: t.brand.primary, false: t.border.default }}
        />
      ) : onPress ? (
        <Icon name="chevron" variant="utility" size={t.space.lg} tint={iconTint ?? t.text.muted} />
      ) : null}
    </View>
  );
  return onPress && !onToggle ? (
    <PressableScale label={detail ? `${title}, ${detail}` : title} onPress={onPress}>
      {content}
    </PressableScale>
  ) : (
    content
  );
}
