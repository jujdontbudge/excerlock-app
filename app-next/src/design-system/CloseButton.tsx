import { PressableScale } from './PressableScale';
import { Icon } from '../icons/Icon';
import { tokens as t } from './tokens';
import { profileTokens as p } from './profileTokens';
import { controls as c } from '../content/controls';
/** The one dismiss control: a brand-orange stroked cross on a 44pt touch target. */
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
      style={{ width: t.layout.touch, height: t.layout.touch, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="close" variant="utility" tint={t.brand.primary} size={p.header.arrow} />
    </PressableScale>
  );
}
