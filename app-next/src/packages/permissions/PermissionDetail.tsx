import { Linking } from 'react-native';
import { Heading, Label, PrimaryButton } from '../ui';
import { permissionsStore as usePermissionsStore } from './permissionsStore';
import { permissionDetailCopy as c } from './permissionDetailsCopy';
import { Permissions } from '../model/types';
import { LivingIcon } from '../ui/LivingIcon';
import { IconName } from '../ui/Icon';
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
