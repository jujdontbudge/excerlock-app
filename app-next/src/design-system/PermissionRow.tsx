import { View } from 'react-native';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { Icon, IconName } from '../icons/Icon';
export function PermissionRow({
  title,
  icon,
  status,
  onPress,
}: {
  title: string;
  icon: IconName;
  status: 'Granted' | 'Off' | 'Needed';
  onPress: () => void;
}) {
  return (
    <PressableScale
      label={`${title}, ${status}`}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.space.md,
        paddingVertical: t.space.md,
      }}>
      <Icon name={icon} />
      <Label style={{ flex: 1 }}>{title}</Label>
      <View
        style={{
          paddingHorizontal: t.space.sm,
          paddingVertical: t.space.xs,
          borderRadius: t.radius.pill,
          backgroundColor: status === 'Granted' ? t.icon.mint : t.surface.subtle,
        }}>
        <Label variant="badge">{status}</Label>
      </View>
      <Icon name="chevron" variant="utility" size={t.space.lg} />
    </PressableScale>
  );
}
