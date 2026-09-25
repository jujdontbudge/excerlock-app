import { useRouter } from 'expo-router';
import { permissionsHref } from '../../src/packages/permissions/useSetupNeeds';
import { ConditionsScreen } from '../../src/packages/editor/ConditionsScreen';
export default function ConditionsRoute() {
  const router = useRouter();
  return (
    <ConditionsScreen
      onAdd={() => router.push('/builder')}
      onEdit={(id) => router.push({ pathname: '/builder', params: { id } })}
      onNeeds={() => router.push(permissionsHref())}
    />
  );
}
