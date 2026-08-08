import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { aboutDetailCopy } from '@/content';
import { PillButton, colors, space, type } from '@/design-system';

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
    <SafeAreaView style={[styles.screen, readerMode && styles.readerScreen]} testID="legal-document-surface">
      <View style={styles.toolbar}>
        <PillButton label={aboutDetailCopy.legal.actions[0]} onPress={onDone} variant="screen" />
        <PillButton label={readerMode ? 'Exit Reader' : aboutDetailCopy.legal.actions[1]} onPress={onToggleReader} variant="screen" />
        <PillButton label={aboutDetailCopy.legal.actions[2]} onPress={onPreviewShare} variant="screen" />
      </View>
      <ScrollView contentContainerStyle={[styles.content, readerMode && styles.readerContent]} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{aboutDetailCopy.legal.eyebrow.toUpperCase()}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { ...type.body, color: colors.text.ink },
  content: { gap: space[4], padding: space[5], paddingBottom: space[16] },
  disclosure: { ...type.caption, color: colors.icon.dark },
  eyebrow: { ...type.micro, color: colors.brand.burnt },
  heading: { ...type.sectionTitle, color: colors.text.ink },
  readerBody: { fontSize: 19, letterSpacing: 0.1, lineHeight: 30 },
  readerContent: { gap: space[5], paddingHorizontal: space[6] },
  readerHeading: { fontSize: 23, lineHeight: 29 },
  readerScreen: { backgroundColor: colors.surface.light },
  readerTitle: { fontSize: 38, lineHeight: 43 },
  screen: { backgroundColor: colors.canvas.ivory, flex: 1 },
  section: { gap: space[2] },
  title: { ...type.screenLarge, color: colors.text.ink },
  toolbar: { alignItems: 'center', borderBottomColor: colors.asset.clayShade, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between' },
  updated: { ...type.caption, color: colors.icon.dark },
});
