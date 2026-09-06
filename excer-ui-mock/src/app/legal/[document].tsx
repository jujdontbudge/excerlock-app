import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AccessibleModal, FullScreenModalPage, PillowCard, PillButton, space } from '@/design-system';
import { LegalDocumentScreen } from '@/features/settings';

export default function LegalDocumentRoute() {
  const { document } = useLocalSearchParams<{ document?: string }>();
  const router = useRouter();
  const [readerMode, setReaderMode] = useState(false);
  const [sharePreview, setSharePreview] = useState(false);
  return (
    <>
      <LegalDocumentScreen
        document={document === 'privacy' ? 'privacy' : 'terms'}
        onDone={() => router.back()}
        onPreviewShare={() => setSharePreview(true)}
        onToggleReader={() => setReaderMode((value) => !value)}
        readerMode={readerMode}
      />
      <AccessibleModal
        accessibilityTitle="Document share preview"
        contentContainerStyle={styles.modalPage}
        onRequestClose={() => setSharePreview(false)}
        scrollEnabled={false}
        style={styles.backdrop}
        visible={sharePreview}
      >
          <PillowCard style={[styles.card, styles.cardFull]} variant="light">
            <FullScreenModalPage
              body="No browser opens, and no document or link is shared."
              footer={<PillButton fullWidth label="Done" onPress={() => setSharePreview(false)} variant="screen" />}
            />
          </PillowCard>
      </AccessibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  card: { gap: space[3] },
  cardFull: { flex: 1, paddingBottom: 0, paddingTop: 0 },
  modalPage: { flex: 1 },
});
