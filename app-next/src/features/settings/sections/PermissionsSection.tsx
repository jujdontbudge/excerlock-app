import { View } from 'react-native';
import { PermissionRow, SettingsGroup } from '../../../design-system';
import { settingsCopy as c } from '../../../content/settings';
import { Permissions } from '../../../domain/types';
import { tokens as t } from '../../../design-system/tokens';
import { permissionsStore as usePermissionsStore } from '../../../state/permissionsStore';
import { permissionIcons } from '../PermissionDetail';

const permissionOrder = Object.keys(c.permissionNames) as (keyof Permissions)[];

export function PermissionsSection({ navigate }: { navigate: (path: string) => void }) {
  const permissions = usePermissionsStore((state) => state.data);
  return (
    <SettingsGroup title={c.permissions}>
      <View style={{ paddingHorizontal: t.space.lg }}>
        {permissionOrder.map((name) => {
          const status = permissions[name];
          const display =
            status === 'granted' || status === 'always' || status === 'whenInUse'
              ? c.permissionRowStatuses.granted
              : status === 'restricted'
                ? c.permissionRowStatuses.restricted
              : status === 'notDetermined'
                ? c.permissionRowStatuses.needed
                : c.permissionRowStatuses.off;
          return (
            <PermissionRow
              key={name}
              title={c.permissionNames[name]}
              icon={permissionIcons[name]}
              status={display}
              onPress={() => navigate(`permission/${name}`)}
            />
          );
        })}
      </View>
    </SettingsGroup>
  );
}
