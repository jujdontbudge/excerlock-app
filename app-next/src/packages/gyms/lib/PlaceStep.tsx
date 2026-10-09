import { Pressable, useWindowDimensions, View } from 'react-native';
import { Heading, Label, Slider } from '../../ui';
import { tokens as t } from '../../ui/tokens';
import { gymPickerCopy as c } from './gymPickerCopy';
import { PickerState } from '../usePicker';
import { PickerMap } from './PickerMap';
import { Icon } from '../../ui/Icon';
export function PlaceStep({ picker: p, onMapTouching }: { picker: PickerState; onMapTouching?: (touching: boolean) => void }) {
  const { height } = useWindowDimensions();
  return (
    <>
      <Heading title={c.pickTitle} />
      <PickerMap
        coordinate={p.pin}
        hasPin={p.hasPin}
        radius={p.radius}
        name={p.name}
        height={Math.min(420, Math.max(340, height * 0.44))}
        showLocation={!!p.location}
        onSettle={p.setPin}
        onTouching={onMapTouching}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={c.search}
        onPress={p.openSearch}
        style={{
          minHeight: t.control.full,
          borderRadius: t.radius.field,
          backgroundColor: t.surface.softChoice,
          borderWidth: t.stroke.hairline,
          borderColor: t.surface.transparent,
          paddingHorizontal: t.space.lg,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.space.md,
        }}>
        <Icon name="search" variant="utility" size={t.icon.md} />
        <Label tone="secondary">{c.search}</Label>
      </Pressable>
      <View
        style={{
          paddingHorizontal: t.space.sm,
          gap: t.space.xs,
        }}>
        <Label variant="label">{c.address}</Label>
        <Label variant="support" tone="secondary">
          {p.hasPin ? p.address || `${p.pin.latitude.toFixed(5)}, ${p.pin.longitude.toFixed(5)}` : c.findingLocation}
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
      </View>
    </>
  );
}
