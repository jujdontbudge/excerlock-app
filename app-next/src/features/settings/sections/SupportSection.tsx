import { useState } from 'react';
import { BottomSheet, Label, PrimaryButton, SettingsGroup, SettingsRow } from '../../../design-system';
import { settingsCopy as c } from '../../../content/settings';
import { LivingIcon } from '../../../motion/LivingIcon';
import { Reveal } from '../../../motion/Reveal';

export function SupportSection({ navigate }: { navigate: (path: string) => void }) {
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rateNote, setRateNote] = useState(false);
  return (
    <>
      <BottomSheet open={sharing} title={c.share} onDismiss={() => setSharing(false)}>
        <LivingIcon name="arrow" />
        <Label>{c.shareBody}</Label>
        <PrimaryButton label={c.shareCopy} onPress={() => setCopied(true)} />
        {copied ? <Label>{c.copied}</Label> : null}
      </BottomSheet>
      <SettingsGroup title={c.supportSection}>
        <SettingsRow title={c.support} icon="mail" onPress={() => navigate('support')} />
        <SettingsRow title={c.rate} icon="star" onPress={() => setRateNote(true)} />
        <SettingsRow
          title={c.share}
          icon="arrow"
          onPress={() => {
            setCopied(false);
            setSharing(true);
          }}
        />
      </SettingsGroup>
      {rateNote ? (
        <Reveal>
          <Label accessibilityRole="alert">{c.rated}</Label>
        </Reveal>
      ) : null}
    </>
  );
}
