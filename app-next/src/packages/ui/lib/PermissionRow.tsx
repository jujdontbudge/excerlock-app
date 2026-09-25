import { View, useWindowDimensions } from 'react-native';
import { tokens as t } from '../tokens';
import { Label } from '../Label';
import { PressableScale } from '../PressableScale';
import { Icon, IconName } from '../Icon';
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
  const stacked = useWindowDimensions().fontScale > 1;
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
      <View
        style={{
          flex: 1,
          flexDirection: stacked ? 'column' : 'row',
          alignItems: stacked ? 'flex-start' : 'center',
          gap: t.space.sm,
        }}>
        <Label style={{ flex: stacked ? undefined : 1 }}>{title}</Label>
        <View
          style={{
            paddingHorizontal: t.space.sm,
            paddingVertical: t.space.xs,
            borderRadius: t.radius.pill,
            backgroundColor: status === 'Granted' ? t.swatch.mint : t.surface.subtle,
          }}>
          <Label variant="micro">{status}</Label>
        </View>
      </View>
      <Icon name="chevron" variant="utility" size={t.icon.sm} />
    </PressableScale>
  );
}
