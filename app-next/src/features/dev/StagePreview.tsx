import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { ScreenShell, Heading, SecondaryButton, Label } from '../../design-system';
import { LivingIcon } from '../../motion/LivingIcon';
import { devCopy as c } from '../../content/dev';
export function StagePreview() {
  const { step } = useLocalSearchParams(),
    path = usePathname(),
    router = useRouter();
  return (
    <ScreenShell footer={<SecondaryButton label={c.title} onPress={() => router.push('/dev')} />}>
      <LivingIcon name="lock" />
      <Heading title={c.stage} support={c.stageBody} />
      <Label>{String(step ?? path)}</Label>
    </ScreenShell>
  );
}
