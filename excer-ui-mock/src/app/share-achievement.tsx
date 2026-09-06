import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { milestoneFixtures } from '@/content';
import {
  AccessibleModal,
  FullScreenModalPage,
  PillowCard,
  PillButton,
  SettingsRow,
  colors,
  radius,
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
        contentContainerStyle={styles.modalPage}
        onRequestClose={closePreview}
        scrollEnabled={false}
        style={styles.backdrop}
        visible={preview !== null}
      >
        <PillowCard style={[styles.card, styles.cardFull]} variant="light">
          <FullScreenModalPage
            footer={<PillButton fullWidth label={result ? 'Done' : preview === 'share' ? 'Cancel' : 'Done'} onPress={closePreview} variant={result || preview === 'save' ? 'screen' : 'text'} />}
          >
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
          </FullScreenModalPage>
        </PillowCard>
      </AccessibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  acknowledgement: { alignItems: 'center', gap: space[2], minHeight: 170, justifyContent: 'center' },
  acknowledgementTitle: { ...type.screenLarge, color: colors.text.ink },
  backdrop: { flex: 1 },
  card: { gap: space[3], padding: space[5] },
  cardFull: { flex: 1, paddingBottom: 0, paddingTop: 0 },
  modalPage: { flex: 1 },
  result: { ...type.label, color: colors.text.primary },
  sectionLabel: { ...type.micro, color: colors.text.ink },
  shareSheetContent: { alignItems: 'stretch', gap: space[2] },
  systemList: { backgroundColor: colors.surface.cardElevated, borderRadius: radius.card, overflow: 'hidden' },
  targets: { gap: space[1] },
});
