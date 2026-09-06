import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { accountCopy } from '@/content';
import {
  AccessibleModal,
  DottedSeparator,
  FullScreenModalPage,
  GradientScreen,
  PillButton,
  PillowCard,
  SettingsRow,
  colors,
  layout,
  radius,
  space,
  type,
} from '@/design-system';

import { PrototypeLabel, SettingsHeader, settingsFeatureStyles as s } from './components';

export interface AccountScreenProps {
  onBack: () => void;
  onDeletePreview: () => void;
  onSignIn: () => void;
  onSignOutPreview: () => void;
  recovered?: boolean;
  signedIn: boolean;
}

export function AccountScreen({ onBack, onDeletePreview, onSignIn, onSignOutPreview, recovered = false, signedIn }: AccountScreenProps) {
  const rows = signedIn ? accountCopy.signedInRows : accountCopy.signedOut.rows;
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  return (
    <>
      <GradientScreen variant="detail">
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <SettingsHeader onBack={onBack} title={accountCopy.title} />
        <PrototypeLabel>LOCAL ACCOUNT PREVIEW</PrototypeLabel>
        {recovered ? <PillowCard variant="elevated"><Text style={s.title}>{accountCopy.recovered.statusChip}</Text><Text style={s.body}>{accountCopy.recovered.notice}</Text></PillowCard> : null}
        {!signedIn ? (
          <PillowCard style={s.cardGap} variant="elevated">
            <Text style={s.label}>{accountCopy.signedOut.statusChip}</Text>
            <Text style={s.sectionTitle}>{accountCopy.signedOut.title}</Text>
            <Text style={s.body}>{accountCopy.signedOut.body}</Text>
          </PillowCard>
        ) : null}
        <PillowCard padding="none" variant="grouped">
          {rows.map((row, index) => (
            <View key={row.label}>
              {index > 0 ? <DottedSeparator /> : null}
              <SettingsRow showChevron={false} title={row.label} value={row.value} />
            </View>
          ))}
        </PillowCard>
        {signedIn ? (
          <>
            <PillButton
              fullWidth
              label="Sign out"
              onPress={() => Alert.alert(accountCopy.signOutAlert.title, accountCopy.signOutAlert.body, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign out', style: 'destructive', onPress: onSignOutPreview },
              ])}
              variant="secondary"
            />
            <PillButton fullWidth label="Delete account" onPress={() => setDeleteOpen(true)} variant="destructive" />
            <Text style={s.note}>Confirmation changes only the local demo identity. No account service is contacted.</Text>
          </>
        ) : (
          <>
            <PillButton fullWidth label={accountCopy.signedOut.primary} onPress={onSignIn} variant="screen" />
            <Text style={s.note}>{accountCopy.signedOut.note}</Text>
          </>
        )}
        </ScrollView>
      </GradientScreen>
      <AccessibleModal
        accessibilityTitle={accountCopy.delete.title}
        contentContainerStyle={styles.modalPage}
        onRequestClose={() => setDeleteOpen(false)}
        scrollEnabled={false}
        style={styles.backdrop}
        visible={deleteOpen}
      >
        <PillowCard style={[styles.modalCard, styles.modalCardFull]} variant="light">
          <FullScreenModalPage
            body={accountCopy.delete.body}
            footer={(
              <>
                <PillButton
                  disabled={deleteConfirmation !== 'DELETE'}
                  fullWidth
                  label={accountCopy.delete.primary}
                  onPress={() => {
                    setDeleteOpen(false);
                    setDeleteConfirmation('');
                    onDeletePreview();
                  }}
                  variant="destructive"
                />
                <PillButton fullWidth label="Cancel" onPress={() => setDeleteOpen(false)} variant="text" />
              </>
            )}
          >
            <View style={styles.confirmationField}>
              <Text style={styles.modalLabel}>{accountCopy.delete.confirmationLabel}</Text>
              <TextInput
                accessibilityLabel={accountCopy.delete.confirmationLabel}
                autoCapitalize="characters"
                onChangeText={setDeleteConfirmation}
                placeholder={accountCopy.delete.placeholder}
                placeholderTextColor={colors.text.placeholder}
                style={styles.input}
                value={deleteConfirmation}
              />
            </View>
          </FullScreenModalPage>
        </PillowCard>
      </AccessibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  confirmationField: { gap: space[2], width: '100%' },
  input: { ...type.body, backgroundColor: colors.surface.field, borderRadius: radius.control, color: colors.text.primary, minHeight: layout.controlHeight, paddingHorizontal: space[4] },
  modalCard: { gap: space[3], padding: space[5] },
  modalCardFull: { flex: 1, paddingBottom: 0, paddingTop: 0 },
  modalLabel: { ...type.label, color: colors.text.ink },
  modalPage: { flex: 1 },
});
