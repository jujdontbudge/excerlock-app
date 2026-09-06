import { useState } from 'react';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  diagnosticsCopy,
  helpArticleDetails,
  helpCopy,
  supportComposerFixtures,
} from '@/content';
import {
  DottedSeparator,
  GradientScreen,
  HeaderBackButton,
  PillButton,
  PillowCard,
  PressableScale,
  SettingsRow,
  colors,
  gradients,
  layout,
  radius,
  space,
  type,
} from '@/design-system';

import { PrototypeLabel, SectionLabel, SettingsHeader, settingsFeatureStyles as s } from './components';

export interface SupportHubScreenProps {
  onBack: () => void;
  onOpenArticle: (articleId: string) => void;
  onOpenContact: () => void;
}

export function SupportHubScreen({ onBack, onOpenArticle, onOpenContact }: SupportHubScreenProps) {
  const [query, setQuery] = useState('');
  const articles = helpCopy.articles.filter((article) => `${article.title} ${article.subtitle}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <GradientScreen variant="ivory">
      <View style={styles.supportHub}>
        <MaskedView
          maskElement={(
            <View style={styles.supportMaskElement}>
              <LinearGradient
                colors={gradients.contentMask.colors}
                locations={gradients.contentMask.locations}
                style={styles.supportTopFade}
              />
              <View style={styles.supportOpaqueMask} />
            </View>
          )}
          style={styles.supportScrollMask}
          testID="support-top-content-mask"
        >
          <ScrollView contentContainerStyle={styles.supportContent} showsVerticalScrollIndicator={false} testID="support-hub-light">
            <TextInput
              accessibilityLabel="Search help"
              onChangeText={setQuery}
              placeholder="Search locking, earning, permissions…"
              placeholderTextColor={colors.text.placeholder}
              style={styles.searchLight}
              value={query}
            />
            <PillowCard padding="none" variant="light">
              <SettingsRow onPress={onOpenContact} subtitle={helpCopy.contactRow.subtitle} title={helpCopy.contactRow.label} tone="light" />
            </PillowCard>
            <SectionLabel>SAMPLE ARTICLES</SectionLabel>
            <PillowCard padding="none" variant="light">
              {articles.map((article, index) => (
                <View key={article.id}>
                  {index > 0 ? <DottedSeparator /> : null}
                  <SettingsRow onPress={() => onOpenArticle(article.id)} subtitle={article.subtitle} title={article.title} tone="light" />
                </View>
              ))}
              {articles.length === 0 ? <Text style={styles.noResultsLight}>No local articles match. Try another word.</Text> : null}
            </PillowCard>
          </ScrollView>
        </MaskedView>
        <View pointerEvents="box-none" style={styles.supportHeader}>
          <SettingsHeader onBack={onBack} title={helpCopy.greeting} />
        </View>
      </View>
    </GradientScreen>
  );
}

export interface SupportArticleScreenProps {
  articleId: string;
  onBack: () => void;
  onOpenRelated: () => void;
}

export function SupportArticleScreen({ articleId, onBack, onOpenRelated }: SupportArticleScreenProps) {
  const article = helpCopy.articles.find((candidate) => candidate.id === articleId) ?? helpCopy.articles[0];
  const detail = helpArticleDetails[article.id];
  return (
    <GradientScreen variant="ivory">
      <ScrollView contentContainerStyle={styles.articleContent} showsVerticalScrollIndicator={false} testID="support-article-light">
        <View style={styles.browserBar}>
          <HeaderBackButton onPress={onBack} />
          <View style={styles.addressBar}>
            <Text numberOfLines={1} style={styles.address}>help.excerlock.local/{article.id}</Text>
          </View>
          <View style={styles.browserBackTarget}><Text accessibilityElementsHidden style={styles.browserMenu}>•••</Text></View>
        </View>
        <PrototypeLabel>LOCAL ARTICLE · NO WEBSITE LOADED</PrototypeLabel>
        <Text accessibilityRole="header" style={styles.articleTitle}>{article.title}</Text>
        <Text style={styles.articleLede}>{detail.lede}</Text>
        {detail.sections.map((section) => (
          <View key={section.title} style={styles.articleSection}>
            <Text accessibilityRole="header" style={styles.articleHeading}>{section.title}</Text>
            <Text style={styles.articleBody}>{section.body}</Text>
          </View>
        ))}
        <PillButton fullWidth label={detail.relatedAction} onPress={onOpenRelated} variant="dark" />
        <Text style={styles.lightNote}>{helpCopy.browserDisclosure}</Text>
      </ScrollView>
    </GradientScreen>
  );
}

export type SupportComposerMode = keyof Pick<typeof supportComposerFixtures, 'contact' | 'bug' | 'idea'>;

export interface SupportComposerScreenProps {
  loading?: boolean;
  message: string;
  mode: SupportComposerMode;
  onAddAttachmentPreview: () => void;
  onBack: () => void;
  onMessageChange: (value: string) => void;
  onSendPreview: () => void;
}

export function SupportComposerScreen({ loading = false, message, mode, onAddAttachmentPreview, onBack, onMessageChange, onSendPreview }: SupportComposerScreenProps) {
  const fixture = supportComposerFixtures[mode];
  const [composerFocused, setComposerFocused] = useState(false);
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SettingsHeader onBack={onBack} title={fixture.title} />
        <PrototypeLabel>NOTHING IS SENT</PrototypeLabel>
        <LinearGradient
          colors={composerFocused
            ? [colors.surface.fieldFocused, colors.surface.bubbleStrong]
            : [colors.surface.bubbleStrong, colors.surface.bubble]}
          end={{ x: 0.5, y: 1 }}
          locations={[0, 1]}
          start={{ x: 0.5, y: 0 }}
          style={[styles.composerBubble, composerFocused && styles.composerBubbleFocused]}
        >
          <TextInput
            accessibilityLabel={fixture.placeholder}
            maxLength={1000}
            multiline
            onBlur={() => setComposerFocused(false)}
            onChangeText={onMessageChange}
            onFocus={() => setComposerFocused(true)}
            placeholder={fixture.placeholder}
            placeholderTextColor={colors.text.placeholder}
            style={styles.composer}
            textAlignVertical="top"
            value={message}
          />
          <Text style={styles.count}>{message.length}/1000</Text>
        </LinearGradient>
        {mode === 'bug' ? (
          <>
            <PillButton label={supportComposerFixtures.shared.bugAttachment} onPress={onAddAttachmentPreview} variant="secondary" />
            <Text style={s.note}>{supportComposerFixtures.shared.attachmentDisclosure}</Text>
          </>
        ) : null}
        <PillowCard>
          <Text style={s.label}>VISIBLE SAMPLE DIAGNOSTICS</Text>
          <Text style={s.body}>{supportComposerFixtures.shared.visibleDiagnostics.join(' · ')}</Text>
        </PillowCard>
        <PillButton disabled={!message.trim()} fullWidth label={supportComposerFixtures.shared.sendAction} loading={loading} onPress={onSendPreview} variant="screen" />
        <Text style={s.note}>{supportComposerFixtures.shared.helper}</Text>
      </ScrollView>
    </GradientScreen>
  );
}

export interface DiagnosticsScreenProps {
  onBack: () => void;
  onNoDataPreview: () => void;
  onPreparePreview: () => void;
  onRowPress: (section: string) => void;
}

export function DiagnosticsScreen({ onBack, onNoDataPreview, onPreparePreview, onRowPress }: DiagnosticsScreenProps) {
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <SettingsHeader onBack={onBack} title={diagnosticsCopy.title} />
        <PrototypeLabel>STATUS-ONLY SAMPLE BUNDLE</PrototypeLabel>
        <Text style={s.body}>{diagnosticsCopy.body}</Text>
        <PillowCard padding="none" variant="grouped">
          {diagnosticsCopy.fields.map((field, index) => (
            <View key={field.section}>
              {index > 0 ? <DottedSeparator /> : null}
              <SettingsRow onPress={() => onRowPress(field.section)} subtitle={field.value} title={field.section} />
            </View>
          ))}
        </PillowCard>
        <PillButton fullWidth label={diagnosticsCopy.primary} onPress={onPreparePreview} variant="screen" />
        <PillButton fullWidth label="Preview no-data recovery" onPress={onNoDataPreview} variant="secondary" />
      </ScrollView>
    </GradientScreen>
  );
}

export function DiagnosticsProgressScreen({ onCancel }: { onCancel: () => void }) {
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <SettingsHeader onBack={onCancel} title={diagnosticsCopy.title} />
        <PrototypeLabel>LOCAL PREPARATION</PrototypeLabel>
        <Text style={s.sectionTitle}>Preparing sample bundle…</Text>
        <Text style={s.body}>Checking the visible status-only fields. No file, health value, app name, gym name, or coordinate is collected.</Text>
        <PillButton fullWidth label="Preparing status-only fields" loading onPress={() => undefined} variant="screen" />
        <Text style={s.note}>This deterministic preview finishes locally.</Text>
      </ScrollView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  address: { ...type.caption, color: colors.text.ink, flex: 1, textAlign: 'center' },
  addressBar: { alignItems: 'center', backgroundColor: colors.surface.bubble, borderColor: colors.surface.bubbleBorder, borderRadius: radius.pill, borderWidth: 1, flex: 1, flexDirection: 'row', gap: space[2], minHeight: 42, paddingHorizontal: space[3] },
  addressSecurity: { ...type.micro, color: colors.brand.burnt },
  articleBody: { ...type.body, color: colors.text.secondary },
  articleContent: { gap: space[4], paddingBottom: space[16] },
  articleHeading: { ...type.sectionTitle, color: colors.text.primary },
  articleLede: { ...type.readerBody, color: colors.text.primary },
  articleSection: { borderTopColor: colors.surface.divider, borderTopWidth: 1, gap: space[2], paddingTop: space[4] },
  articleTitle: { ...type.screenLarge, color: colors.text.primary },
  browserBackTarget: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  browserBar: { alignItems: 'center', flexDirection: 'row', gap: space[2] },
  browserMenu: { ...type.label, color: colors.text.primary },
  composer: { ...type.callout, color: colors.text.primary, minHeight: layout.largeFieldHeight, padding: 0 },
  composerBubble: {
    borderColor: colors.surface.bubbleBorder,
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 170,
    overflow: 'hidden',
    paddingBottom: space[3],
    paddingHorizontal: space[5],
    paddingTop: space[5],
  },
  composerBubbleFocused: { borderColor: colors.surface.fieldFocused },
  count: { ...type.caption, alignSelf: 'flex-end', color: colors.text.primary, marginTop: space[2] },
  lightNote: { ...type.caption, color: colors.text.tertiary },
  lightSectionTitle: { ...type.sectionTitle, color: colors.text.primary },
  noResultsLight: { ...type.body, color: colors.text.ink, padding: space[4], textAlign: 'center' },
  searchLight: { ...type.body, backgroundColor: colors.surface.field, borderColor: colors.surface.bubbleBorder, borderRadius: radius.control, borderWidth: 1, color: colors.text.primary, minHeight: layout.controlHeight, paddingHorizontal: space[4] },
  supportContent: { gap: space[4], paddingBottom: space[16], paddingTop: layout.supportHeaderInset },
  supportHeader: { left: 0, minHeight: 96, position: 'absolute', right: 0, top: 0, zIndex: 2 },
  supportHub: { flex: 1 },
  supportMaskElement: { flex: 1 },
  supportOpaqueMask: { backgroundColor: colors.surface.light, flex: 1 },
  supportScrollMask: { flex: 1 },
  supportTopFade: { height: 104 },
});
