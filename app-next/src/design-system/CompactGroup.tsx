import { Children, PropsWithChildren } from 'react';
import { Switch, View, StyleSheet, useWindowDimensions } from 'react-native';
import { Icon, IconName } from '../icons/Icon';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { feedback } from '../motion/haptics';

/** Opt-in reference-sized groups; existing sheets keep their geometry. */
/** `outline` swaps the grey hairline for the black analytics outline on a translucent card. */
export function CompactGroup({ title, outline = false, children }: PropsWithChildren<{ title?: string; outline?: boolean }>) {
  return (
    <View style={{ gap: 8 }}>
      {title ? (
        <Label accessibilityRole="header" variant="label" style={{ paddingHorizontal: 8 }}>
          {title}
        </Label>
      ) : null}
      <View style={[s.group, outline && { borderColor: t.border.outline, backgroundColor: t.surface.glass }]}>
        {Children.toArray(children).map((child, i) => (
          <View key={i}>
            {i ? <View style={s.divider} /> : null}
            {child}
          </View>
        ))}
      </View>
    </View>
  );
}
export function CompactRow({
  title,
  value,
  subtitle,
  icon,
  onPress,
  status,
  toggle,
  onToggle,
}: {
  title: string;
  value?: string;
  subtitle?: string;
  icon: IconName;
  onPress?: () => void;
  status?: boolean;
  toggle?: boolean;
  onToggle?: (value: boolean) => void;
}) {
  const stacked = useWindowDimensions().fontScale > 1.2;
  const content = (
    <View style={[s.row, subtitle ? { minHeight: 60 } : null]}>
      <Icon name={icon} variant="utility" size={28} tint={t.brand.primary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Label style={{ fontWeight: subtitle ? '600' : '400' }}>{title}</Label>
        {subtitle ? (
          <Label tone="secondary" variant="support">
            {subtitle}
          </Label>
        ) : null}
        {stacked && value ? (
          <Label tone="secondary" variant="support">
            {value}
          </Label>
        ) : null}
      </View>
      {!stacked && value ? (
        <View style={s.status}>
          {status !== undefined ? (
            <View style={[s.dot, { backgroundColor: status ? t.state.success : t.text.muted }]} />
          ) : null}
          <Label tone="secondary" variant="support">
            {value}
          </Label>
        </View>
      ) : null}
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
        <Icon name="chevron" variant="utility" size={16} tint={t.brand.primary} />
      ) : null}
    </View>
  );
  return onPress && !onToggle ? (
    <PressableScale label={[title, value].filter(Boolean).join(', ')} onPress={onPress}>
      {content}
    </PressableScale>
  ) : (
    content
  );
}
const s = StyleSheet.create({
  group: {
    borderRadius: 20,
    backgroundColor: t.surface.card,
    borderWidth: 1,
    borderColor: t.border.outline,
    overflow: 'hidden',
  },
  row: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: { height: 1, backgroundColor: t.border.divider, marginLeft: 56, marginRight: 16 },
  status: { flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 1 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
