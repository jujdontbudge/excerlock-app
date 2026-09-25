import { useRouter, useLocalSearchParams } from 'expo-router';
import { SettingsPage } from '../../../src/features/settings/SettingsPage';
import { PermissionDetail } from '../../../src/features/settings/PermissionDetail';
import { Permissions } from '../../../src/domain/types';
import { permissionDetailCopy } from '../../../src/content/permissionDetails';
export default function PermissionRoute() {
  const r = useRouter(),
    { name } = useLocalSearchParams<{ name: string }>();
  return (
    <SettingsPage onBack={() => r.back()}>
      <PermissionDetail name={(name in permissionDetailCopy.permissionNames ? name : 'screenTime') as keyof Permissions} />
    </SettingsPage>
  );
}
