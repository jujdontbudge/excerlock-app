import { PressableScale } from '../PressableScale';
import { Icon } from '../Icon';
import { tokens as t } from '../tokens';
import { controls as c } from '../controlsCopy';
export function CloseButton({
  onPress,
  label = c.close,
  testID,
}: {
  onPress: () => void;
  label?: string;
  testID?: string;
}) {
  return (
    <PressableScale
      label={label}
      testID={testID}
      onPress={onPress}
      haptic="select"
      style={{ width: t.icon.md, height: t.control.inline, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="close" variant="utility" size={t.icon.md} />
    </PressableScale>
  );
}
