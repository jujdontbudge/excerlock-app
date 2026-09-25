import { Linking } from 'react-native';
import { Heading, Label, PrimaryButton } from '../../design-system';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { permissionDetailCopy as c } from '../../content/permissionDetails';
import { Permissions } from '../../domain/types';
import { LivingIcon } from '../../motion/LivingIcon';
import { IconName } from '../../icons/Icon';
export const permissionIcons: Record<keyof Permissions, IconName> = {
  screenTime: 'shield',
  motion: 'walking',
  location: 'map-pin',
  camera: 'person',
  notifications: 'bell',
};
export function PermissionDetail({ name }: { name: keyof Permissions }) {
  const status = usePermissionsStore((s) => s.data[name]);
  return (
    <>
      <Heading title={c.permissionNames[name]} support={c.statuses[status]} />
      <LivingIcon name={permissionIcons[name]} />
      <Label>{c.why[name]}</Label>
      <Label tone="secondary">{c.without[name]}</Label>
      <PrimaryButton label={c.openSettings} onPress={() => void Linking.openSettings()} />
    </>
  );
}
