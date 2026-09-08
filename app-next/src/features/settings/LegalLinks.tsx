import { useState } from 'react';
import { Label, BottomSheet } from '../../design-system';
import { welcomeCopy } from '../../content/welcome';
import { feedback } from '../../motion/haptics';
import { tokens as t } from '../../design-system/tokens';
import { welcomeTokens as w } from '../../design-system/welcomeTokens';
import { LegalScreen } from './LegalScreen';

export function LegalLinks({ lead }: { lead: string }) {
  const [document, setDocument] = useState<'privacy' | 'terms' | null>(null);
  const show = (next: Exclude<typeof document, null>) => {
    feedback();
    setDocument(next);
  };
  return (
    <>
      <Label style={{ ...w.type.legal, color: t.text.muted, textAlign: 'center' }}>
        {lead}
        <Label
          accessibilityRole="button"
          accessibilityLabel={welcomeCopy.privacy}
          onPress={() => show('privacy')}
          style={w.type.legal}>
          {welcomeCopy.privacy}
        </Label>
        {welcomeCopy.and}
        <Label
          accessibilityRole="button"
          accessibilityLabel={welcomeCopy.terms}
          onPress={() => show('terms')}
          style={w.type.legal}>
          {welcomeCopy.terms}
        </Label>
      </Label>
      <BottomSheet
        open={document !== null}
        title={welcomeCopy.legalTitle}
        onDismiss={() => setDocument(null)}>
        {document ? <LegalScreen doc={document} /> : null}
      </BottomSheet>
    </>
  );
}
