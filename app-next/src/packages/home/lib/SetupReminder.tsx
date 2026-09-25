import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Label, PrimaryButton } from '../../ui';
import { tokens as t } from '../../ui/tokens';
import { homeCopy as c } from '../homeCopy';
import { Reveal } from '../../ui/Reveal';
import { needCopyKey, permissionsHref, useSetupNeeds } from '../../permissions/useSetupNeeds';

export function SetupReminder() {
  const router = useRouter(),
    { needs, location } = useSetupNeeds(),
    need = needs[0];
  if (!need) return null;
  const key = needCopyKey(need, location);
  return (
    <Reveal>
      <View
        testID="home-setup-reminder"
        style={{
          padding: t.space.md,
          gap: t.space.md,
          backgroundColor: t.surface.card,
          borderRadius: t.radius.card,
          borderWidth: t.stroke.hairline,
          borderColor: t.border.outline,
        }}>
        <View style={{ gap: t.space.xs }}>
          <Label variant="section" style={{ textAlign: 'center' }}>
            {c.needs[key]}
          </Label>
          <Label tone="secondary" style={{ textAlign: 'center' }}>
            {c.needsBody}
          </Label>
        </View>
        <PrimaryButton label={c.fixNeed[key]} onPress={() => router.push(permissionsHref(need))} />
      </View>
    </Reveal>
  );
}
