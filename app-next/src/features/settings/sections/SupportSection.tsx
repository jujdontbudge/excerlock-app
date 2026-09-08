import { useState } from 'react';
import { Share } from 'react-native';
import { Label, SettingsGroup, SettingsRow } from '../../../design-system';
import { settingsCopy as c } from '../../../content/settings';
import { APP_STORE_URL } from '../../../adapters/appStore/links';
import { rateManually } from '../../../adapters/review/reviewPrompts';
import { Reveal } from '../../../motion/Reveal';
import { useRuntime } from '../../../runtime/AppRuntimeProvider';

export function SupportSection({ navigate }: { navigate: (path: string) => void }) {
  const runtime = useRuntime();
  const [note, setNote] = useState('');
  const rate = async () => {
    try {
      await rateManually(runtime);
      setNote(c.rated);
    } catch {
      setNote(c.error);
    }
  };
  const share = async () => {
    try {
      await Share.share({ message: c.shareMessage, url: APP_STORE_URL });
    } catch {
      setNote(c.error);
    }
  };
  return (
    <>
      <SettingsGroup title={c.supportSection}>
        <SettingsRow title={c.support} icon="mail" onPress={() => navigate('support')} />
        <SettingsRow title={c.rate} icon="star" onPress={() => void rate()} />
        <SettingsRow title={c.share} icon="arrow" onPress={() => void share()} />
      </SettingsGroup>
      {note ? (
        <Reveal key={note}>
          <Label accessibilityRole="alert">{note}</Label>
        </Reveal>
      ) : null}
    </>
  );
}
