import { View } from 'react-native';
import { BackButton, ScreenShell, PrimaryButton, Label, OnboardingHeader } from '../ui';
import { tokens as t } from '../ui/tokens';
import { gymPickerCopy as c } from './lib/gymPickerCopy';
import { useRuntime } from '../ports/useRuntime';
import { usePicker } from './usePicker';
import { FindStep } from './lib/FindStep';
import { PlaceStep } from './lib/PlaceStep';
import Animated from 'react-native-reanimated';
import { fadeIn } from '../ui/presets';
export function GymPickerScreen({
  placeId,
  onSaved,
  onBack,
  onClose,
}: {
  placeId?: string;
  onSaved: () => void;
  onBack?: () => void;
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
              paddingHorizontal: t.layout.page - (t.control.inline - t.icon.md) / 2,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.xs }}>
              <BackButton label={c.backToSearch} onPress={p.back} />
              <Label style={{ color: t.text.primary }}>{c.searchTitle}</Label>
            </View>
          </View>
        ) : onBack ? (
          <OnboardingHeader progress={0} showProgress={false} onBack={onBack} onClose={onClose} />
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
