import { Pressable, useWindowDimensions, View } from 'react-native';
import { Heading, Label, Slider } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { gymPickerCopy as c } from '../../content/gymPicker';
import { PickerState } from './usePicker';
import { PickerMap } from './PickerMap';
import { Icon } from '../../icons/Icon';
export function PlaceStep({ picker: p }: { picker: PickerState }) {
  const { height } = useWindowDimensions();
  return (
    <>
      <Heading title={c.pickTitle} />
      <PickerMap
        coordinate={p.pin}
        radius={p.radius}
        name={p.name}
        height={Math.min(420, Math.max(340, height * 0.44))}
        showLocation={!!p.location}
        onSettle={p.setPin}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={c.search}
        onPress={p.openSearch}
        style={{
          minHeight: t.layout.field,
          borderRadius: t.radius.field,
          backgroundColor: t.surface.card,
          borderWidth: t.stroke.hairline,
          borderColor: t.border.outline,
          paddingHorizontal: t.space.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
        }}>
        <Icon name="search" variant="utility" size={t.layout.glyph} tint={t.brand.primary} />
        <Label tone="secondary">{c.search}</Label>
      </Pressable>
      <View
        style={{
          paddingHorizontal: t.space.sm,
          gap: t.space.xs,
        }}>
        <Label variant="label">{c.address}</Label>
        <Label variant="support" tone="secondary">
          {p.address || `${p.pin.latitude.toFixed(5)}, ${p.pin.longitude.toFixed(5)}`}
        </Label>
        <View
          style={{
            marginTop: t.space.sm,
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: t.space.sm,
          }}>
          <Label variant="label">{c.radius}</Label>
          <Label variant="label" style={{ color: t.text.primary }}>
            {p.radius} m
          </Label>
        </View>
        <Slider label={c.radius} value={p.radius} min={50} max={200} step={10} onChange={p.setRadius} />
        {p.limit || p.error ? (
          <Label accessibilityRole="alert" variant="support" style={{ color: t.state.error }}>
            {p.limit ? c.limit : p.error}
          </Label>
        ) : null}
      </View>
    </>
  );
}
