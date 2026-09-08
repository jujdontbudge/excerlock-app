import { View } from 'react-native';
import { Label, PressableScale, SettingsGroup } from '../../../design-system';
import { settingsCopy as c } from '../../../content/settings';
import { tokens as t } from '../../../design-system/tokens';
import { Icon } from '../../../icons/Icon';
import { profileStore as useProfileStore } from '../../../state/profileStore';
import { sessionStore as useSessionStore } from '../../../state/sessionStore';

export function ProfileHeader({ onPress }: { onPress: () => void }) {
  const name = useProfileStore((state) => state.data.name);
  const session = useSessionStore((state) => state.data.session);
  const title = name || c.profile;
  const subtitle = session.kind === 'anonymous' ? c.anonymous : c.signedIn(session.provider);
  return (
    <SettingsGroup>
      <PressableScale label={`${title}, ${subtitle}`} onPress={onPress}>
        <View
          style={{
            minHeight: t.layout.row + t.space.xl,
            flexDirection: 'row',
            alignItems: 'center',
            padding: t.space.lg,
            gap: t.space.md,
          }}>
          <Icon name="person" size={t.space.xxxl} />
          <View style={{ flex: 1, gap: t.space.xs }}>
            <Label variant="section">{title}</Label>
            <Label variant="support" tone="secondary">
              {subtitle}
            </Label>
          </View>
          <Icon name="chevron" variant="utility" size={t.space.lg} tint={t.text.muted} />
        </View>
      </PressableScale>
    </SettingsGroup>
  );
}
