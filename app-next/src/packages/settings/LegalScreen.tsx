import { useState } from 'react';
import { Linking } from 'react-native';
import { Heading, Label, PrimaryButton } from '../ui';
import { notify } from '../ui/Notice';
import { legalCopy } from './lib/legalCopy';
export function LegalScreen({ doc }: { doc: 'privacy' | 'terms' }) {
  const c = legalCopy[doc];
  const [opening, setOpening] = useState(false);
  const open = async () => {
    if (opening) return;
    setOpening(true);
    try { await Linking.openURL(c.url); }
    catch { notify(legalCopy.openError); }
    finally { setOpening(false); }
  };
  return (
    <>
      <Heading title={c.title} support={legalCopy.description} />
      <Label selectable tone="secondary">{c.url}</Label>
      <PrimaryButton label={c.action} loading={opening} onPress={() => void open()} />
    </>
  );
}
