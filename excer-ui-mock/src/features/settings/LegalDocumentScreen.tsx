import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { aboutDetailCopy } from '@/content';
import { GradientScreen, PillButton, colors, space, type } from '@/design-system';

export interface LegalDocumentScreenProps {
  document: 'terms' | 'privacy';
  onDone: () => void;
  onPreviewShare: () => void;
  onToggleReader: () => void;
  readerMode: boolean;
}

export function LegalDocumentScreen({ document, onDone, onPreviewShare, onToggleReader, readerMode }: LegalDocumentScreenProps) {
  const title = document === 'terms' ? aboutDetailCopy.legal.titles[0] : aboutDetailCopy.legal.titles[1];
  return (
    <GradientScreen edgeToEdge variant="home">
      <View style={styles.screen} testID="legal-document-surface">
        <View style={styles.toolbar}>
          <PillButton label={aboutDetailCopy.legal.actions[0]} onPress={onDone} variant="screen" />
          <PillButton label={readerMode ? 'Exit Reader' : aboutDetailCopy.legal.actions[1]} onPress={onToggleReader} variant="screen" />
          <PillButton label={aboutDetailCopy.legal.actions[2]} onPress={onPreviewShare} variant="screen" />
        </View>
        <ScrollView contentContainerStyle={[styles.content, readerMode && styles.readerContent]} showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, readerMode && styles.readerTitle]}>{title}</Text>
          <Text style={styles.updated}>Updated {aboutDetailCopy.legal.updated}</Text>
          <Text style={[styles.body, readerMode && styles.readerBody]} testID="legal-opening-body">{aboutDetailCopy.legal.openingBody}</Text>
          {['What this preview covers', 'Your local demo choices', 'Permissions and sample data', 'Changes to this local document'].map((heading) => (
            <View key={heading} style={styles.section}>
              <Text style={[styles.heading, readerMode && styles.readerHeading]}>{heading}</Text>
              <Text style={[styles.body, readerMode && styles.readerBody]}>This section demonstrates a readable local document layout. It creates no agreement, opens no website, and sends no information.</Text>
            </View>
          ))}
          <Text style={styles.disclosure}>{aboutDetailCopy.legal.disclosure}</Text>
        </ScrollView>
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  body: { ...type.body, color: colors.text.secondary },
  content: { gap: space[4], padding: space[5], paddingBottom: space[16] },
  disclosure: { ...type.caption, color: colors.text.tertiary },
  eyebrow: { ...type.micro, color: colors.brand.signatureAmber },
  heading: { ...type.sectionTitle, color: colors.text.primary },
  readerBody: { ...type.readerBody },
  readerContent: { gap: space[5], paddingHorizontal: space[6] },
  readerHeading: { ...type.readerHeading },
  readerTitle: { ...type.readerTitle },
  screen: { flex: 1 },
  section: { gap: space[2] },
  title: { ...type.screenLarge, color: colors.text.primary },
  toolbar: { alignItems: 'center', borderBottomColor: colors.surface.divider, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between' },
  updated: { ...type.caption, color: colors.text.secondary },
});
