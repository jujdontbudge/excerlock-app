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
  embedded = false,
}: {
  placeId?: string;
  onSaved: () => void;
  onClose?: () => void;
  embedded?: boolean;
}) {
  const { gym } = useRuntime();
  const p = usePicker(
    gym,
    onSaved,
    gym.listPlaces().find((x) => x.id === placeId),
  );
  const page = embedded ? 0 : t.layout.page;
  // Searching steps back to the place it came from; naming a place can be abandoned outright.
  const header =
    p.stage === 'find' ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: page,
        }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.back}
          onPress={p.back}
          style={{ minHeight: t.layout.touch, flexDirection: 'row', alignItems: 'center', gap: t.space.sm }}>
          <Icon name="back" variant="utility" size={t.layout.glyph} tint={t.brand.primary} />
          <Label style={{ color: t.brand.primary }}>{c.searchTitle}</Label>
        </Pressable>
      </View>
    ) : onClose ? (
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: page }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.cancel}
          onPress={onClose}
          style={{ minHeight: t.layout.touch, justifyContent: 'center' }}>
          <Label style={{ color: t.brand.primary }}>{c.cancel}</Label>
        </Pressable>
      </View>
    ) : undefined;
  const save =
    p.stage === 'place' ? (
      <PrimaryButton label={c.save} disabled={!p.name.trim() || p.limit} loading={p.busy} onPress={() => void p.save()} />
    ) : undefined;
  const content = (
    <>
      {embedded ? header : null}
      <Animated.View key={p.stage} entering={fadeIn} style={{ gap: p.stage === 'place' ? t.space.md : t.space.xl }}>
        {p.stage === 'find' ? <FindStep picker={p} /> : <PlaceStep picker={p} />}
      </Animated.View>
      {embedded ? save : null}
    </>
  );
  if (embedded) return content;
  return (
    <ScreenShell scrollResetKey={p.stage} header={header} footer={save}>
      {content}
    </ScreenShell>
  );
}
