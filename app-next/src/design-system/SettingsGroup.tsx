import { Children, PropsWithChildren } from 'react';
import { View } from 'react-native';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { Reveal } from '../motion/Reveal';
/** `outline` sets the group on the translucent card, for groups that sit over the orange wash. */
export function SettingsGroup({
  title,
  outline = false,
  children,
}: PropsWithChildren<{ title?: string; outline?: boolean }>) {
  return (
    <View style={{ gap: t.space.sm }}>
      {title ? (
        <Label accessibilityRole="header" variant="support" tone="secondary">
          {title}
        </Label>
      ) : null}
      <View
        testID="settings-group-card"
        style={{
          backgroundColor: outline ? t.surface.glass : t.surface.card,
          borderWidth: t.stroke.hairline,
          borderColor: t.border.outline,
          borderRadius: t.radius.card,
          overflow: 'hidden',
        }}>
        {Children.toArray(children).map((child, index) => (
          <Reveal key={index} index={index}>
            <View
              style={{
                borderTopWidth: index ? t.stroke.hairline : 0,
                borderColor: t.border.divider,
              }}>
              {child}
            </View>
          </Reveal>
        ))}
      </View>
    </View>
  );
}
