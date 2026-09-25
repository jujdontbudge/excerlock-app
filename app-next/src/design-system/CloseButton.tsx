import { PressableScale } from './PressableScale';
import { Icon } from '../icons/Icon';
import { tokens as t } from './tokens';
import { controls as c } from '../content/controls';
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
      style={{ width: t.control.inline, height: t.control.inline, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="close" variant="utility" size={t.icon.md} />
    </PressableScale>
  );
}
