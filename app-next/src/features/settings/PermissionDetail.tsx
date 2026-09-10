import { useState } from 'react';
import { Heading, Label, PrimaryButton } from '../../design-system';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';
import { settingsCopy as c } from '../../content/settings';
import { Permissions } from '../../domain/types';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
import { IconName } from '../../icons/Icon';
export const permissionIcons: Record<keyof Permissions, IconName> = {
  screenTime: 'shield',
  motion: 'walking',
  location: 'map-pin',
  camera: 'person',
  notifications: 'bell',
};
export function PermissionDetail({ name }: { name: keyof Permissions }) {
  const status = usePermissionsStore((s) => s.data[name]),
    [note, setNote] = useState(false);
  return (
    <>
      <Heading title={c.permissionNames[name]} support={c.statuses[status]} />
      <LivingIcon name={permissionIcons[name]} />
      <Label>{c.why[name]}</Label>
      <Label tone="secondary">{c.without[name]}</Label>
      <PrimaryButton label={c.openSettings} onPress={() => setNote(true)} />
      {note ? (
        <Reveal>
          <Label>{c.settingsNote}</Label>
        </Reveal>
      ) : null}
    </>
  );
}
