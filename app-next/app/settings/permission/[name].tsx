import { useRouter, useLocalSearchParams } from 'expo-router';
import { SettingsPage } from '../../../src/packages/ui/SettingsPage';
import { PermissionDetail } from '../../../src/packages/permissions/PermissionDetail';
import { Permissions } from '../../../src/packages/model/types';
import { permissionDetailCopy } from '../../../src/packages/permissions/permissionDetailsCopy';
export default function PermissionRoute() {
  const r = useRouter(),
    { name } = useLocalSearchParams<{ name: string }>();
  return (
    <SettingsPage onBack={() => r.back()}>
      <PermissionDetail name={(name in permissionDetailCopy.permissionNames ? name : 'screenTime') as keyof Permissions} />
    </SettingsPage>
  );
}
