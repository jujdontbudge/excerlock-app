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
  status,
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
  /** A green (on) or muted (off) dot beside the value. */
  status?: boolean;
}) {
  const fontScale = useWindowDimensions().fontScale;
  const stacked = !!subtitle || fontScale > 1;
  const detail = subtitle ?? value;
  const content = (
    <View
      style={{
        minHeight: t.control.row,
        flexDirection: 'row',
        alignItems: 'center',
        padding: t.space.lg,
        paddingHorizontal: flat ? 0 : t.space.lg,
        gap: t.space.md,
      }}>
      {icon ? <Icon name={icon} size={t.icon.lg} /> : null}
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
          <ValueReveal
            value={detail}
            style={{ flexShrink: 1, flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
            {status !== undefined ? (
              <View
                testID="settings-row-status"
                style={{
                  width: t.layout.dot,
                  height: t.layout.dot,
                  borderRadius: t.radius.pill,
                  backgroundColor: status ? t.state.success : t.border.mutedStroke,
                }}
              />
            ) : null}
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
          trackColor={{ true: t.brand.primary, false: t.border.divider }}
        />
      ) : onPress ? (
        <Icon name="chevron" variant="utility" size={t.icon.sm} tone="muted" />
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
