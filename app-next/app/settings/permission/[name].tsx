import { useRouter, useLocalSearchParams } from 'expo-router';
import { SettingsPage } from '../../../src/features/settings/SettingsPage';
import { PermissionDetail } from '../../../src/features/settings/PermissionDetail';
import { Permissions } from '../../../src/domain/types';
import { settingsCopy } from '../../../src/content/settings';
export default function PermissionRoute() {
  const r = useRouter(),
    { name } = useLocalSearchParams<{ name: string }>();
  return (
    <SettingsPage onBack={() => r.back()}>
      <PermissionDetail name={(name in settingsCopy.permissionNames ? name : 'screenTime') as keyof Permissions} />
    </SettingsPage>
  );
}
