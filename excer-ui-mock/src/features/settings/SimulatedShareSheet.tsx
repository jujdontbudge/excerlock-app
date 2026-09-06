import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  AccessibleModal,
  DottedSeparator,
  FullScreenModalPage,
  PillowCard,
  PillButton,
  SettingsRow,
  colors,
  space,
  type,
} from '@/design-system';

const destinations = ['AirDrop', 'Messages', 'Mail', 'Copy'] as const;

export interface SimulatedShareSheetProps {
  disclosure: string;
  onDone: () => void;
  onRequestClose: () => void;
  onSelectDestination: (destination: string) => void;
  previewSubtitle: string;
  previewTitle: string;
  selectedDestination: string | null;
  visible: boolean;
}

/**
 * Shared, explicitly fake stand-in for iOS share handoffs. The parent owns the
 * selected result so dismissing and reopening always has deterministic state.
 */
export function SimulatedShareSheet({
  disclosure,
  onDone,
  onRequestClose,
  onSelectDestination,
  previewSubtitle,
  previewTitle,
  selectedDestination,
  visible,
}: SimulatedShareSheetProps) {
  const complete = selectedDestination !== null;
  return (
    <AccessibleModal
      accessibilityTitle={complete ? 'Share preview complete' : 'Share preview'}
      contentContainerStyle={styles.modalPage}
      onRequestClose={onRequestClose}
      scrollEnabled={false}
      style={styles.backdrop}
      visible={visible}
    >
      <PillowCard style={[styles.sheet, styles.sheetFull]} variant="light">
        <FullScreenModalPage
          body={complete ? `${selectedDestination} was selected locally. ${disclosure}` : undefined}
          footer={complete
            ? <PillButton accessibilityLabel="Close share preview" fullWidth label="Done" onPress={onDone} variant="screen" />
            : <PillButton fullWidth label="Cancel" onPress={onRequestClose} variant="text" />}
        >
          {!complete ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <PillowCard style={styles.preview} variant="strong">
              <Text style={styles.previewTitle}>{previewTitle}</Text>
              <Text style={styles.previewSubtitle}>{previewSubtitle}</Text>
            </PillowCard>
            <PillowCard padding="none" variant="light">
              {destinations.map((destination, index) => (
                <View key={destination}>
                  {index > 0 ? <DottedSeparator /> : null}
                  <SettingsRow
                    accessibilityLabel={destination}
                    onPress={() => onSelectDestination(destination)}
                    showChevron={false}
                    title={destination}
                    tone="light"
                    value="Preview"
                  />
                </View>
              ))}
            </PillowCard>
            <Text style={styles.disclosure}>{disclosure}</Text>
          </ScrollView>
          ) : null}
        </FullScreenModalPage>
      </PillowCard>
    </AccessibleModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  content: { gap: space[3] },
  disclosure: { ...type.caption, color: colors.text.ink },
  divider: { backgroundColor: colors.asset.clayShade, height: StyleSheet.hairlineWidth },
  eyebrow: { ...type.micro, color: colors.brand.burnt },
  modalPage: { flex: 1 },
  preview: { gap: space[1] },
  previewSubtitle: { ...type.caption, color: colors.text.secondary },
  previewTitle: { ...type.cardTitle, color: colors.text.primary },
  sheet: { gap: space[3], padding: space[5] },
  sheetFull: { flex: 1, paddingBottom: 0, paddingTop: 0 },
});
