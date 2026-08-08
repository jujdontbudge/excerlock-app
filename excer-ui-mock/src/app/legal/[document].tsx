import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AccessibleModal, AccessibleModalTitle, PillowCard, PillButton, colors, space, type } from '@/design-system';
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
        animationType="slide"
        onRequestClose={() => setSharePreview(false)}
        style={styles.backdrop}
        visible={sharePreview}
      >
          <PillowCard style={styles.card} variant="light">
            <AccessibleModalTitle style={styles.title}>Document share preview</AccessibleModalTitle>
            <Text style={styles.body}>No browser opens, and no document or link is shared.</Text>
            <PillButton fullWidth label="Done" onPress={() => setSharePreview(false)} variant="dark" />
          </PillowCard>
      </AccessibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.surface.scrim, flex: 1, justifyContent: 'flex-end', padding: space[4] },
  body: { ...type.body, color: colors.text.ink },
  card: { gap: space[3] },
  title: { ...type.screenTitle, color: colors.text.ink },
});
