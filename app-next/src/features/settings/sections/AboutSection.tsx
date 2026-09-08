import { useState } from 'react';
import { Label, PressableScale, SettingsGroup } from '../../../design-system';
import { settingsCopy as c } from '../../../content/settings';
import { devMenuEnabled } from '../../../runtime/devFlag';
import { appBuildInfo } from '../appBuildInfo';

export function AboutSection({ onDev }: { onDev: () => void }) {
  const [taps, setTaps] = useState(0);
  const info = appBuildInfo();
  const version = c.version(info.version, info.build);
  return (
    <SettingsGroup title={c.about}>
      <PressableScale
        label={version}
        onPress={() => {
          if (!devMenuEnabled) return;
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
