import { View } from 'react-native';
import { Icon } from './Icon';
import { tokens as t } from './tokens';
import { Reveal } from './Reveal';
export function SelectionCheck({ size = t.control.indicator }: { size?: number }) {
  return (
    <Reveal>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: t.radius.pill,
          backgroundColor: t.text.onAccent,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="check" variant="utility" size={t.icon.sm} />
      </View>
    </Reveal>
  );
}
