import { View } from 'react-native';
import { Icon } from '../icons/Icon';
import { ProgressBar } from './ProgressBar';
import { PressableScale } from './PressableScale';
import { tokens as t } from './tokens';
import { controls } from '../content/controls';
export function OnboardingHeader({
  progress,
  onBack,
  onClose,
}: {
  progress: number;
  onBack?: () => void;
  onClose?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.md,
        paddingHorizontal: t.space.xl,
        paddingVertical: t.space.sm,
      }}>
      <PressableScale
        label={controls.back}
        disabled={!onBack}
        accessibilityState={{ disabled: !onBack }}
        onPress={onBack}
        style={{
          width: t.layout.touch,
          alignItems: 'center',
          opacity: onBack ? 1 : 0,
        }}>
        <Icon name="back" variant="utility" size={t.layout.glyph} />
      </PressableScale>
      <View style={{ flex: 1 }}>
        <ProgressBar value={progress} label={controls.progress} />
      </View>
      {onClose ? (
        <PressableScale
          label={controls.close}
          onPress={onClose}
          style={{ width: t.layout.touch, alignItems: 'center' }}>
          <Icon name="close" variant="utility" size={t.layout.glyph} />
        </PressableScale>
      ) : (
        <View style={{ width: t.layout.touch }} />
      )}
    </View>
  );
}
