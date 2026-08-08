import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  diagnosticsCopy,
  helpArticleDetails,
  helpCopy,
  supportComposerFixtures,
} from '@/content';
import {
  GradientScreen,
  PillButton,
  PillowCard,
  PressableScale,
  SettingsRow,
  colors,
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
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} testID="support-hub-light">
        <SettingsHeader light onBack={onBack} title={helpCopy.title} />
        <Text style={styles.lightSectionTitle}>{helpCopy.greeting}</Text>
        <PrototypeLabel light>LOCAL SUPPORT CONTENT</PrototypeLabel>
        <TextInput
          accessibilityLabel="Search help"
          onChangeText={setQuery}
          placeholder="Search locking, earning, permissions…"
          placeholderTextColor={colors.icon.dark}
          style={styles.searchLight}
          value={query}
        />
        <PillowCard padding="none" variant="light">
          <SettingsRow onPress={onOpenContact} subtitle={helpCopy.contactRow.subtitle} title={helpCopy.contactRow.label} tone="light" />
        </PillowCard>
        <SectionLabel light>SAMPLE ARTICLES</SectionLabel>
        <PillowCard padding="none" variant="light">
          {articles.map((article, index) => (
            <View key={article.id}>
              {index > 0 ? <View style={s.divider} /> : null}
              <SettingsRow onPress={() => onOpenArticle(article.id)} subtitle={article.subtitle} title={article.title} tone="light" />
            </View>
          ))}
          {articles.length === 0 ? <Text style={styles.noResultsLight}>No local articles match. Try another word.</Text> : null}
        </PillowCard>
        <Text style={styles.lightNote}>{helpCopy.browserDisclosure}</Text>
      </ScrollView>
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
          <PressableScale accessibilityLabel="Back to Help" accessibilityRole="button" onPress={onBack}>
            <View style={styles.browserBackTarget}><Text style={styles.browserBack}>‹</Text></View>
          </PressableScale>
          <View style={styles.addressBar}>
            <Text style={styles.addressSecurity}>LOCAL</Text>
            <Text numberOfLines={1} style={styles.address}>help.excerlock.local/{article.id}</Text>
          </View>
          <View style={styles.browserBackTarget}><Text accessibilityElementsHidden style={styles.browserMenu}>•••</Text></View>
        </View>
        <PrototypeLabel light>LOCAL ARTICLE · NO WEBSITE LOADED</PrototypeLabel>
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
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SettingsHeader onBack={onBack} title={fixture.title} />
        <PrototypeLabel>NOTHING IS SENT</PrototypeLabel>
        <TextInput
          accessibilityLabel={fixture.placeholder}
          maxLength={1000}
          multiline
          onChangeText={onMessageChange}
          placeholder={fixture.placeholder}
          placeholderTextColor={colors.text.tertiary}
          style={styles.composer}
          textAlignVertical="top"
          value={message}
        />
        <Text style={styles.count}>{message.length}/1000</Text>
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
              {index > 0 ? <View style={s.divider} /> : null}
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
  addressBar: { alignItems: 'center', backgroundColor: colors.surface.light, borderRadius: radius.pill, flex: 1, flexDirection: 'row', gap: space[2], minHeight: 42, paddingHorizontal: space[3] },
  addressSecurity: { ...type.micro, color: colors.brand.burnt },
  articleBody: { ...type.body, color: colors.text.ink, opacity: 0.76 },
  articleContent: { gap: space[4], paddingBottom: space[16] },
  articleHeading: { ...type.sectionTitle, color: colors.text.ink },
  articleLede: { ...type.body, color: colors.text.ink, fontSize: 18, lineHeight: 27 },
  articleSection: { borderTopColor: colors.asset.clayShade, borderTopWidth: StyleSheet.hairlineWidth, gap: space[2], paddingTop: space[4] },
  articleTitle: { ...type.screenLarge, color: colors.text.ink },
  browserBack: { color: colors.text.ink, fontSize: 34, fontWeight: '300', lineHeight: 38 },
  browserBackTarget: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  browserBar: { alignItems: 'center', flexDirection: 'row', gap: space[2] },
  browserMenu: { ...type.label, color: colors.text.ink },
  composer: { ...type.body, backgroundColor: colors.surface.cardElevated, borderRadius: radius.cardLarge, color: colors.text.primary, minHeight: 220, padding: space[4] },
  count: { ...type.caption, color: colors.text.tertiary, textAlign: 'right' },
  lightNote: { ...type.caption, color: colors.text.ink, opacity: 0.6 },
  lightSectionTitle: { ...type.sectionTitle, color: colors.text.ink },
  noResultsLight: { ...type.body, color: colors.text.ink, opacity: 0.68, padding: space[4], textAlign: 'center' },
  searchLight: { ...type.body, backgroundColor: colors.surface.light, borderRadius: radius.actionRow, color: colors.text.ink, minHeight: 48, paddingHorizontal: space[4] },
});
