import { ScrollView, View } from 'react-native';
import { Label } from '../../ui';
import { Icon, iconNames } from '../../ui/Icon';
import { tokens as t } from '../../ui/tokens';

const variants = Object.keys(t.type) as (keyof typeof t.type)[];

export function TypeSpecimen() {
  return (
    <ScrollView contentContainerStyle={{ padding: t.space.lg, paddingTop: t.layout.header, paddingLeft: t.control.full + t.space.lg, gap: t.space.sm, backgroundColor: t.surface.card }}>
      {variants.map((variant) => (
        <View key={variant} style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
          <Label accessible accessibilityLabel={`bare ${variant}`} variant={variant}>
            HEH
          </Label>
          <View
            accessible
            accessibilityLabel={`box ${variant}`}
            style={{ height: t.control.full + t.type[variant].lineHeight, paddingHorizontal: t.space.md, justifyContent: 'center', alignItems: 'center', backgroundColor: t.surface.well }}>
            <Label variant={variant}>HEH</Label>
          </View>
          <View
            accessible
            accessibilityLabel={`row ${variant}`}
            style={{ height: t.control.full + t.type[variant].lineHeight, paddingHorizontal: t.space.md, flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface.well }}>
            <Label variant={variant} style={{ flexShrink: 1 }}>
              HEH
            </Label>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export function IconSpecimen() {
  return (
    <ScrollView contentContainerStyle={{ padding: t.space.lg, paddingTop: t.layout.header, paddingLeft: t.control.full + t.space.lg, flexDirection: 'row', flexWrap: 'wrap', gap: t.space.sm, backgroundColor: t.surface.card }}>
      {iconNames.map((name) => (
        <View
          key={name}
          accessible
          accessibilityLabel={`icon ${name}`}
          style={{ width: t.icon.lg + t.space.lg, height: t.icon.lg + t.space.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: t.surface.card }}>
          <Icon name={name} size={t.icon.lg} />
        </View>
      ))}
    </ScrollView>
  );
}
