import { useRouter } from 'expo-router';
import { permissionsHref } from '../../src/features/setup/useSetupNeeds';
import { ConditionsScreen } from '../../src/features/conditions/ConditionsScreen';
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
