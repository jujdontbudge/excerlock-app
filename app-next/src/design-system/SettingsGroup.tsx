import { Children, PropsWithChildren } from 'react';
import { View } from 'react-native';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { Reveal } from '../motion/Reveal';
export function SettingsGroup({ title, children }: PropsWithChildren<{ title?: string }>) {
  return (
    <View style={{ gap: t.space.sm }}>
      {title ? (
        <Label accessibilityRole="header" variant="support" tone="secondary">
          {title}
        </Label>
      ) : null}
      <View
        style={{
          backgroundColor: t.surface.subtle,
          borderRadius: t.radius.card,
          overflow: 'hidden',
        }}>
        {Children.toArray(children).map((child, index) => (
          <Reveal key={index} index={index}>
            <View
              style={{
                borderTopWidth: index ? t.stroke.hairline : 0,
                borderColor: t.border.default,
              }}>
              {child}
            </View>
          </Reveal>
        ))}
      </View>
    </View>
  );
}
