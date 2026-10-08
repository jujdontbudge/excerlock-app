import { useCallback, useRef } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Label, PrimaryButton } from '../../ui';
import { tokens as t } from '../../ui/tokens';
import { homeCopy as c } from '../homeCopy';
import { Reveal } from '../../ui/Reveal';
import { needCopyKey, permissionsHref, useSetupNeeds } from '../../permissions/useSetupNeeds';

export function SetupReminder() {
  const locked = useRef(false);
  useFocusEffect(useCallback(() => { locked.current = false; }, []));
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
          backgroundColor: t.surface.softChoice,
          borderRadius: t.radius.card,
          borderWidth: t.stroke.hairline,
          borderColor: t.surface.transparent,
        }}>
        <View style={{ gap: t.space.xs }}>
          <Label variant="section" style={{ textAlign: 'center' }}>
            {c.needs[key]}
          </Label>
          <Label tone="secondary" style={{ textAlign: 'center' }}>
            {c.needsBody}
          </Label>
        </View>
        <PrimaryButton label={c.fixNeed[key]} onPress={() => {
          if (locked.current) return;
          locked.current = true;
          router.push(permissionsHref(need));
        }} />
      </View>
    </Reveal>
  );
}
