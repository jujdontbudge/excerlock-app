import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  AccessibleModal,
  AccessibleModalTitle,
  PillowCard,
  PillButton,
  SettingsRow,
  colors,
  radius,
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
      animationType="slide"
      onRequestClose={onRequestClose}
      style={styles.backdrop}
      visible={visible}
    >
      <PillowCard style={styles.sheet} variant="light">
        <View style={styles.grabber} />
        <Text style={styles.eyebrow}>{complete ? 'LOCAL SHARE RESULT' : 'SIMULATED IOS SHARE SHEET'}</Text>
        <AccessibleModalTitle style={styles.title}>
          {complete ? 'Share preview complete' : 'Share preview'}
        </AccessibleModalTitle>
        {complete ? (
          <>
            <Text style={styles.body}>{selectedDestination} was selected locally. {disclosure}</Text>
            <PillButton accessibilityLabel="Close share preview" fullWidth label="Done" onPress={onDone} variant="dark" />
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <PillowCard style={styles.preview} variant="strong">
              <Text style={styles.previewTitle}>{previewTitle}</Text>
              <Text style={styles.previewSubtitle}>{previewSubtitle}</Text>
            </PillowCard>
            <PillowCard padding="none" variant="light">
              {destinations.map((destination, index) => (
                <View key={destination}>
                  {index > 0 ? <View style={styles.divider} /> : null}
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
            <PillButton fullWidth label="Cancel" onPress={onRequestClose} variant="dark" />
          </ScrollView>
        )}
      </PillowCard>
    </AccessibleModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.surface.scrim, flex: 1, justifyContent: 'flex-end', padding: space[3] },
  body: { ...type.body, color: colors.text.ink },
  content: { gap: space[3] },
  disclosure: { ...type.caption, color: colors.text.ink, opacity: 0.62 },
  divider: { backgroundColor: colors.asset.clayShade, height: StyleSheet.hairlineWidth },
  eyebrow: { ...type.micro, color: colors.brand.burnt },
  grabber: { alignSelf: 'center', backgroundColor: colors.asset.clayShade, borderRadius: radius.pill, height: 5, width: 42 },
  preview: { gap: space[1] },
  previewSubtitle: { ...type.caption, color: colors.text.secondary },
  previewTitle: { ...type.cardTitle, color: colors.text.primary },
  sheet: { gap: space[3], maxHeight: '88%', padding: space[5] },
  title: { ...type.screenTitle, color: colors.text.ink },
});
