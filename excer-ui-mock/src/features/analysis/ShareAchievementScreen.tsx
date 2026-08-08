import { StyleSheet, Text, View } from 'react-native';

import { shareAchievementFixtures, type MilestoneFixture } from '@/content';
import { PillButton, SegmentedControl, SheetFrame, colors, radius, space, type } from '@/design-system';

import { Eyebrow, analysisFeatureStyles as s } from './components';

export type ShareAchievementKind = 'milestone' | 'recap';
export type ShareFormat = 'story' | 'square';

export interface ShareAchievementScreenProps {
  badge?: MilestoneFixture;
  format: ShareFormat;
  kind: ShareAchievementKind;
  onChangeFormat: (format: ShareFormat) => void;
  onClose: () => void;
  onPreviewSave: () => void;
  onPreviewShare: () => void;
}

const formats = [{ label: '9:16', value: 'story' }, { label: '1:1', value: 'square' }] as const;

export function ShareAchievementScreen({ badge, format, kind, onChangeFormat, onClose, onPreviewSave, onPreviewShare }: ShareAchievementScreenProps) {
  return (
    <SheetFrame
      footer={
        <View style={styles.footer}>
          <PillButton fullWidth label="Share" onPress={onPreviewShare} variant="screen" />
          <PillButton fullWidth label="Save Image" onPress={onPreviewSave} variant="secondary" />
        </View>
      }
      onClose={onClose}
      title="Share achievement"
    >
      <View style={s.content}>
        <Eyebrow>PROTOTYPE SHARE PREVIEW</Eyebrow>
        <SegmentedControl accessibilityLabel="Share card format" onChange={onChangeFormat} options={formats} value={format} />
        <ShareCardPreview badge={badge} format={format} kind={kind} />
        <Text style={s.note}>{kind === 'milestone' ? shareAchievementFixtures.milestone.privacyNote : 'Uses aggregate sample numbers only.'}</Text>
        <Text style={s.note}>No share sheet opens and no image is written until the router presents the labeled local preview.</Text>
      </View>
    </SheetFrame>
  );
}

export function ShareCardPreview({ badge, compact = false, format, kind }: {
  badge?: MilestoneFixture;
  compact?: boolean;
  format: ShareFormat;
  kind: ShareAchievementKind;
}) {
  const content = getShareCardContent(kind, badge);
  return (
    <View
      accessibilityLabel={`Achievement preview thumbnail, ${content.hero}, ${content.title}, ${content.meta}`}
      accessible
      style={[
        styles.preview,
        format === 'square' ? styles.square : styles.story,
        compact && styles.previewCompact,
        compact && format === 'square' ? styles.squareCompact : undefined,
        compact && format === 'story' ? styles.storyCompact : undefined,
      ]}
    >
      <Text style={[styles.brand, compact && styles.brandCompact]}>ExcerLock</Text>
      <View style={styles.previewCopy}>
        <Text style={[styles.previewHero, compact && styles.previewHeroCompact]}>{content.hero}</Text>
        <Text numberOfLines={2} style={[styles.previewTitle, compact && styles.previewTitleCompact]}>{content.title}</Text>
        <Text numberOfLines={2} style={[styles.previewMeta, compact && styles.previewMetaCompact]}>{content.meta}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: { ...type.cardTitle, color: colors.text.primary },
  brandCompact: { ...type.micro },
  footer: { gap: space[2] },
  preview: { alignSelf: 'center', backgroundColor: colors.brand.primary, borderRadius: radius.cardLarge, justifyContent: 'space-between', padding: space[5], width: '100%' },
  previewCompact: { borderRadius: radius.card, padding: space[3], width: undefined },
  previewCopy: { gap: space[2] },
  previewHero: { ...type.heroMd, color: colors.text.primary },
  previewHeroCompact: { ...type.sectionTitle },
  previewMeta: { ...type.body, color: colors.text.primary },
  previewMetaCompact: { ...type.micro },
  previewTitle: { ...type.sectionTitle, color: colors.text.primary },
  previewTitleCompact: { ...type.caption },
  square: { aspectRatio: 1 },
  squareCompact: { height: 140, width: 140 },
  story: { aspectRatio: 9 / 16, maxHeight: 500 },
  storyCompact: { height: 170, width: 96 },
});

function getShareCardContent(kind: ShareAchievementKind, badge?: MilestoneFixture) {
  if (kind === 'recap') {
    const recap = shareAchievementFixtures.recap;
    return { hero: recap.hero, meta: `${recap.activeDays} · ${recap.earns}`, title: recap.range };
  }
  if (!badge) {
    const milestone = shareAchievementFixtures.milestone;
    return { hero: milestone.hero, meta: milestone.unlockMonth, title: milestone.name };
  }
  const suffix = badge.threshold.unit === 'hours' ? 'h' : badge.threshold.unit === 'days' ? ' days' : '';
  const monthParts = badge.unlockedAt?.split(' ') ?? [];
  const monthNames: Record<string, string> = { Apr: 'April', Aug: 'August', Dec: 'December', Feb: 'February', Jan: 'January', Jul: 'July', Jun: 'June', Mar: 'March', May: 'May', Nov: 'November', Oct: 'October', Sep: 'September' };
  const meta = monthParts.length === 3 ? `${monthNames[monthParts[0]] ?? monthParts[0]} ${monthParts[2]}` : 'Sample milestone';
  return { hero: `${badge.threshold.value}${suffix}`, meta, title: badge.name };
}
