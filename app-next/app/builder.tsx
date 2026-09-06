import { useRouter } from 'expo-router';
import { ScreenShell, EmptyState, SecondaryButton } from '../src/design-system';
import { homeCopy as c } from '../src/content/home';
export default function BuilderPlaceholder() {
  const router = useRouter();
  return (
    <ScreenShell footer={<SecondaryButton label={c.close} onPress={() => router.back()} />}>
      <EmptyState title={c.add} body={c.placeholder} icon="plus" />
    </ScreenShell>
  );
}
