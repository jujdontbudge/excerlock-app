import { Linking } from 'react-native';
import { Heading, Label, PrimaryButton, SecondaryButton } from '../../design-system';
import { settingsCopy as c } from '../../content/settings';
import { Permissions } from '../../domain/types';
import { IconName } from '../../icons/Icon';
import { LivingIcon } from '../../motion/LivingIcon';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { permissionsStore as usePermissionsStore } from '../../state/permissionsStore';

export const permissionIcons: Record<keyof Permissions, IconName> = {
  screenTime: 'shield',
  motion: 'walking',
  location: 'map-pin',
  health: 'heart',
  camera: 'person',
  notifications: 'bell',
};

const isGranted = (status: Permissions[keyof Permissions]) =>
  status === 'granted' || status === 'whenInUse' || status === 'always';

export function PermissionDetail({ name }: { name: keyof Permissions }) {
  const runtime = useRuntime();
  const status = usePermissionsStore((s) => s.data[name]);
  const request = async () => {
    const result =
      name === 'screenTime'
        ? await runtime.screenTime.requestAuthorization()
        : name === 'motion'
          ? await runtime.steps.request()
          : name === 'location'
            ? await runtime.gym.requestLocation()
            : name === 'health'
              ? await runtime.health.request()
              : name === 'camera'
                ? await runtime.gait.permission()
                : await runtime.notifications.request();
    usePermissionsStore.getState().patch({ [name]: result });
  };

  return (
    <>
      <Heading title={c.permissionNames[name]} support={c.statuses[status]} />
      <LivingIcon name={permissionIcons[name]} />
      <Label>{c.why[name]}</Label>
      {isGranted(status) ? (
        <>
          <Label tone="secondary">{c.permissionOn}</Label>
          <Label tone="secondary">{c.permissionPaths[name]}</Label>
          <SecondaryButton label={c.changeSettings} onPress={() => void Linking.openSettings()} />
        </>
      ) : status === 'notDetermined' ? (
        <PrimaryButton label={c.allow} onPress={() => void request()} />
      ) : status === 'restricted' ? (
        <Label tone="secondary">{c.restricted}</Label>
      ) : (
        <>
          <Label tone="secondary">{c.without[name]}</Label>
          <Label tone="secondary">{c.permissionPaths[name]}</Label>
          <PrimaryButton label={c.openSettings} onPress={() => void Linking.openSettings()} />
        </>
      )}
    </>
  );
}
