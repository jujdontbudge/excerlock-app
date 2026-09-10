import { useState } from 'react';
import { Linking } from 'react-native';
import { Heading, Label, PrimaryButton } from '../../design-system';
import { legalCopy } from '../../content/legal';
export function LegalScreen({ doc }: { doc: 'privacy' | 'terms' }) {
  const c = legalCopy[doc];
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const open = async () => {
    if (opening) return;
    setOpening(true);
    setFailed(false);
    try { await Linking.openURL(c.url); }
    catch { setFailed(true); }
    finally { setOpening(false); }
  };
  return (
    <>
      <Heading title={c.title} support={legalCopy.description} />
      <Label selectable tone="secondary">{c.url}</Label>
      {failed ? <Label accessibilityRole="alert">{legalCopy.openError}</Label> : null}
      <PrimaryButton label={c.action} loading={opening} onPress={() => void open()} />
    </>
  );
}
