import { Pressable, View } from 'react-native';
import { ScreenShell, PrimaryButton, Label } from '../../design-system';
import { Icon } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';
import { gymPickerCopy as c } from '../../content/gymPicker';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { usePicker } from './usePicker';
import { FindStep } from './FindStep';
import { PlaceStep } from './PlaceStep';
import Animated from 'react-native-reanimated';
import { fadeIn } from '../../motion/presets';
export function GymPickerScreen({
  placeId,
  onSaved,
  onClose,
}: {
  placeId?: string;
  onSaved: () => void;
  onClose?: () => void;
}) {
  const { gym } = useRuntime();
  const p = usePicker(
    gym,
    onSaved,
    gym.listPlaces().find((x) => x.id === placeId),
  );
  return (
    <ScreenShell
      scrollResetKey={p.stage}
      header={
        p.stage === 'find' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: t.layout.page,
            }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.back}
              onPress={p.back}
              style={{
                minHeight: t.layout.touch,
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.space.sm,
              }}>
              <Icon name="back" variant="utility" size={t.layout.glyph} tint={t.brand.primary} />
              <Label style={{ color: t.brand.primary }}>{c.searchTitle}</Label>
            </Pressable>
          </View>
        ) : onClose ? (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: t.layout.page }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={c.cancel}
              onPress={onClose}
              style={{ minHeight: t.layout.touch, justifyContent: 'center' }}>
              <Label style={{ color: t.brand.primary }}>{c.cancel}</Label>
            </Pressable>
          </View>
        ) : undefined
      }
      footer={
        p.stage === 'place' ? (
          <PrimaryButton
            label={c.save}
            disabled={!p.name.trim() || p.limit}
            loading={p.busy}
            onPress={() => void p.save()}
          />
        ) : undefined
      }>
      <Animated.View key={p.stage} entering={fadeIn} style={{ gap: p.stage === 'place' ? t.space.md : t.space.xl }}>
        {p.stage === 'find' ? <FindStep picker={p} /> : <PlaceStep picker={p} />}
      </Animated.View>
    </ScreenShell>
  );
}
