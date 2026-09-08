import Constants from 'expo-constants';
import { useState } from 'react';
import { Label, PressableScale, SettingsGroup } from '../../../design-system';
import { settingsCopy as c } from '../../../content/settings';

export function AboutSection({ onDev }: { onDev: () => void }) {
  const [taps, setTaps] = useState(0);
  const version = c.version(
    Constants.expoConfig?.version ?? c.defaultVersion,
    Constants.expoConfig?.ios?.buildNumber ?? c.defaultBuild,
  );
  return (
    <SettingsGroup title={c.about}>
      <PressableScale
        label={version}
        onPress={() => {
          if (taps === 6) {
            setTaps(0);
            onDev();
          } else setTaps(taps + 1);
        }}>
        <Label tone="secondary" style={{ textAlign: 'center' }}>
          {version}
        </Label>
      </PressableScale>
    </SettingsGroup>
  );
}
