import { StyleSheet, Text, View } from 'react-native';

import {
  notificationEntryFixtures,
  notificationEntrySharedCopy,
  notificationPreviewCopy,
  type NotificationPreviewSlug,
} from '@/content';
import {
  GradientScreen,
  PillButton,
  PillowCard,
  colors,
  radius,
  space,
  type,
} from '@/design-system';

export type NotificationPreviewPhase = 'unopened' | 'tapped';

export interface NotificationPreviewScreenProps {
  onDismiss: () => void;
  onEnterDestination: (slug: NotificationPreviewSlug) => void;
  phase?: NotificationPreviewPhase;
  slug: NotificationPreviewSlug;
}

export function NotificationPreviewScreen({
  onDismiss,
  onEnterDestination,
  phase = 'unopened',
  slug,
}: NotificationPreviewScreenProps) {
  const fixture = notificationEntryFixtures.find((entry) => entry.slug === slug) ?? notificationEntryFixtures[0];
  const notificationCopy = slug === 'last-call' ? notificationPreviewCopy.lastCall : notificationPreviewCopy[slug];

  return (
    <GradientScreen variant="night">
      <View style={styles.screen}>
        <View style={styles.disclosure}>
          <Text style={styles.previewLabel}>LOCAL NOTIFICATION PREVIEW · {fixture.designId}</Text>
          <Text style={styles.previewBody}>No notification was scheduled or delivered. Opening this card only changes local demo navigation.</Text>
        </View>

        {phase === 'unopened' ? (
          <View style={styles.center}>
            <PillowCard style={styles.notificationCard} variant="light">
              <View style={styles.notificationHeader}>
                <View style={styles.appGlyph}><Text style={styles.appGlyphText}>E</Text></View>
                <Text style={styles.appName}>{notificationEntrySharedCopy.appName}</Text>
                <Text style={styles.time}>{notificationEntrySharedCopy.timestamp}</Text>
              </View>
              <Text style={styles.notificationTitle}>{notificationCopy.title}</Text>
              <Text style={styles.notificationBody}>{notificationCopy.body}</Text>
            </PillowCard>
          </View>
        ) : (
          <View style={styles.center}>
            <PillowCard style={styles.destinationCard} variant="elevated">
              <Text style={styles.entryChip}>{fixture.entryChip}</Text>
              <Text style={styles.destinationTitle}>{fixture.conclusion}</Text>
              <Text style={styles.destinationBody}>{fixture.body}</Text>
              <Text style={styles.focusLabel}>FOCUS TARGET</Text>
              <Text style={styles.destinationFocus}>{fixture.focus}</Text>
              <Text style={styles.localDisclosure}>{notificationEntrySharedCopy.disclosure}</Text>
            </PillowCard>
          </View>
        )}

        <View style={styles.actions}>
          <PillButton
            fullWidth
            label={phase === 'unopened' ? 'Tap notification preview' : 'Open focused screen'}
            onPress={() => onEnterDestination(slug)}
            variant="screen"
          />
          <PillButton accessibilityLabel={notificationEntrySharedCopy.dismissAccessibilityLabel} fullWidth label="Dismiss preview" onPress={onDismiss} variant="text" />
        </View>
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space[2] },
  appGlyph: { alignItems: 'center', backgroundColor: colors.brand.primary, borderRadius: radius.xs, height: 28, justifyContent: 'center', width: 28 },
  appGlyphText: { ...type.label, color: colors.text.primary },
  appName: { ...type.label, color: colors.text.ink, flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
  destinationBody: { ...type.body, color: colors.text.secondary },
  destinationCard: { gap: space[3] },
  destinationFocus: { ...type.body, color: colors.text.primary },
  destinationTitle: { ...type.screenTitle, color: colors.text.primary },
  disclosure: { alignItems: 'center', gap: space[1] },
  entryChip: { ...type.micro, alignSelf: 'flex-start', backgroundColor: colors.brand.primary, borderRadius: radius.pill, color: colors.text.ink, overflow: 'hidden', paddingHorizontal: space[3], paddingVertical: space[2] },
  focusLabel: { ...type.micro, color: colors.brand.signatureAmber },
  localDisclosure: { ...type.caption, color: colors.text.tertiary },
  notificationBody: { ...type.body, color: colors.text.ink, marginTop: space[1] },
  notificationCard: { backgroundColor: colors.surface.ivoryBlur, gap: space[1], shadowColor: colors.canvas.contentTop, shadowOffset: { height: 8, width: 0 }, shadowOpacity: 0.24, shadowRadius: 20 },
  notificationHeader: { alignItems: 'center', flexDirection: 'row', gap: space[2], marginBottom: space[2] },
  notificationTitle: { ...type.cardTitle, color: colors.text.ink },
  previewBody: { ...type.caption, color: colors.text.secondary, textAlign: 'center' },
  previewLabel: { ...type.micro, color: colors.brand.signatureAmber, textAlign: 'center' },
  screen: { flex: 1, gap: space[4], paddingBottom: space[4], paddingTop: space[2] },
  time: { ...type.caption, color: colors.icon.dark },
});
