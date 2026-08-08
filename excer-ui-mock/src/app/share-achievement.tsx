import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { milestoneFixtures } from '@/content';
import {
  AccessibleModal,
  AccessibleModalTitle,
  PillowCard,
  PillButton,
  SettingsRow,
  colors,
  space,
  type,
} from '@/design-system';
import { firstSearchParam, ShareAchievementScreen, ShareCardPreview, type ShareFormat } from '@/features/analysis';

export default function ShareAchievementRoute() {
  const { badgeId, type: shareType } = useLocalSearchParams<{
    badgeId?: string | string[];
    type?: string | string[];
  }>();
  const router = useRouter();
  const [format, setFormat] = useState<ShareFormat>('story');
  const [preview, setPreview] = useState<'share' | 'save' | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const kind = firstSearchParam(shareType) === 'recap' ? 'recap' : 'milestone';
  const badge = milestoneFixtures.find((item) => item.assetId === firstSearchParam(badgeId));
  const previewTitle = preview === 'share' ? 'iOS share preview' : 'Save Image preview';

  const closePreview = () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = null;
    setPreview(null);
    setResult(null);
  };

  const selectShareTarget = (target: string) => {
    setResult(`Shared via ${target} · local prototype only`);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(closePreview, 750);
  };

  useEffect(() => () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  }, []);

  return (
    <>
      <ShareAchievementScreen
        badge={badge}
        format={format}
        kind={kind}
        onChangeFormat={setFormat}
        onClose={() => router.back()}
        onPreviewSave={() => {
          setResult(null);
          setPreview('save');
        }}
        onPreviewShare={() => {
          setResult(null);
          setPreview('share');
        }}
      />
      <AccessibleModal
        accessibilityTitle={previewTitle}
        animationType="slide"
        onRequestClose={closePreview}
        style={styles.backdrop}
        visible={preview !== null}
      >
        <PillowCard style={styles.card} variant="light">
          <AccessibleModalTitle style={styles.title}>{previewTitle}</AccessibleModalTitle>
          <Text style={styles.body}>Simulated native surface · no data leaves this prototype.</Text>
          {preview === 'share' ? (
            result ? (
              <View accessibilityLiveRegion="polite" style={styles.acknowledgement}>
                <Text style={styles.acknowledgementTitle}>Shared</Text>
                <Text style={styles.result}>{result}</Text>
              </View>
            ) : (
              <View style={styles.shareSheetContent}>
                <ShareCardPreview badge={badge} compact format={format} kind={kind} />
                <Text style={styles.sectionLabel}>SHARE WITH</Text>
                <View style={styles.targets}>
                  {['AirDrop', 'Messages', 'Mail'].map((target) => (
                    <SettingsRow key={target} onPress={() => selectShareTarget(target)} showChevron={false} title={target} tone="light" />
                  ))}
                </View>
                <Text style={styles.sectionLabel}>ACTIONS</Text>
                <View style={styles.systemList}>
                  {['Copy', 'Save to Files', 'Print'].map((target) => (
                    <SettingsRow key={target} onPress={() => selectShareTarget(target)} title={target} tone="light" />
                  ))}
                </View>
              </View>
            )
          ) : (
            <SettingsRow onPress={() => setResult('Save acknowledged locally')} showChevron={false} title="Save to Photos preview" tone="light" />
          )}
          {preview === 'save' && result ? <Text accessibilityLiveRegion="polite" style={styles.result}>{result}</Text> : null}
          {preview === 'share' && result ? null : <PillButton fullWidth label={preview === 'share' ? 'Cancel' : 'Done'} onPress={closePreview} variant="dark" />}
        </PillowCard>
      </AccessibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  acknowledgement: { alignItems: 'center', gap: space[2], minHeight: 170, justifyContent: 'center' },
  acknowledgementTitle: { ...type.screenLarge, color: colors.text.ink },
  backdrop: { backgroundColor: colors.surface.scrim, flex: 1, justifyContent: 'flex-end', padding: space[4] },
  body: { ...type.body, color: colors.text.ink, opacity: 0.7 },
  card: { gap: space[3], padding: space[5] },
  result: { ...type.label, color: colors.brand.burnt },
  sectionLabel: { ...type.micro, color: colors.text.ink, opacity: 0.58 },
  shareSheetContent: { alignItems: 'stretch', gap: space[2] },
  systemList: { backgroundColor: colors.surface.cardElevated, borderRadius: 16, overflow: 'hidden' },
  targets: { gap: space[1] },
  title: { ...type.screenTitle, color: colors.text.ink },
});
