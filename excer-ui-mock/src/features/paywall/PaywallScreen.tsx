import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AccessibleModal,
  FullScreenModalPage,
  IconChip,
  PillowCard,
  PillButton,
  SettingsRow,
  StaticVectorImage,
  colors,
  radius,
  space,
  type,
} from '@/design-system';
import {
  paywallCopy,
  paywallPlans,
  paywallProofCards,
  paywallTimelines,
  premiumFeatures,
  purchasePreview,
  restoreFixtures,
} from '@/content/paywall';
import { assetRegistry } from '@/content';
import { FeatureScaffold, PrototypeNotice, SectionHeading } from '@/features/shared';

export type PaywallPlan = 'annual' | 'monthly';
export type PaywallFixtureOverlay = 'purchase' | 'loading' | 'success' | 'failure';

export type PaywallScreenProps = {
  fixtureOverlay?: PaywallFixtureOverlay;
  onOpenLegal: (document: 'terms' | 'privacy') => void;
  onPurchaseComplete: (plan: PaywallPlan) => void;
  onRestoreComplete: () => void;
  onSelectPlan: (plan: PaywallPlan) => void;
  selectedPlan: PaywallPlan;
};

type RestoreOutcome = 'restored' | 'none';
type Overlay =
  | PaywallFixtureOverlay
  | 'included'
  | 'restore-choice'
  | 'restore-loading'
  | 'restore-restored'
  | 'restore-none'
  | null;

export function PaywallScreen({
  fixtureOverlay,
  onOpenLegal,
  onPurchaseComplete,
  onRestoreComplete,
  onSelectPlan,
  selectedPlan,
}: PaywallScreenProps) {
  const [overlay, setOverlay] = useState<Overlay>(fixtureOverlay ?? null);
  const [restoreOutcome, setRestoreOutcome] = useState<RestoreOutcome>('none');
  const selected = paywallPlans.find((plan) => plan.id === selectedPlan) ?? paywallPlans[0];
  const timeline = paywallTimelines[selectedPlan];
  const modalTitle = overlay === 'included'
    ? 'What’s included'
    : overlay === 'restore-choice'
      ? 'Choose a restore result'
      : overlay === 'restore-loading'
        ? restoreFixtures.loading.title
      : overlay === 'restore-restored'
        ? restoreFixtures.restored.title
        : overlay === 'restore-none'
          ? restoreFixtures.none.title
      : overlay === 'success'
        ? purchasePreview.success.title
        : overlay === 'failure'
          ? purchasePreview.failure.title
        : purchasePreview.product;

  useEffect(() => {
    if (overlay !== 'loading' || fixtureOverlay === 'loading') return;
    const timer = setTimeout(() => setOverlay('success'), 550);
    return () => clearTimeout(timer);
  }, [fixtureOverlay, overlay]);

  useEffect(() => {
    if (overlay !== 'restore-loading') return;
    const timer = setTimeout(
      () => setOverlay(restoreOutcome === 'restored' ? 'restore-restored' : 'restore-none'),
      550,
    );
    return () => clearTimeout(timer);
  }, [overlay, restoreOutcome]);

  return (
    <View style={styles.screen}>
      <FeatureScaffold accessibilityLabel={paywallCopy.title}>
        <View style={styles.heroBlock}>
          <StaticVectorImage
            source={assetRegistry.heroes['paywall-hero']}
            style={styles.hero}
          />
          <Text style={styles.title}>{paywallCopy.title}</Text>
          <Text style={styles.body}>{paywallCopy.body}</Text>
        </View>

        <View style={styles.section}>
          <SectionHeading>
            {selectedPlan === 'annual' ? 'Try it with a clear timeline' : 'A simple monthly timeline'}
          </SectionHeading>
          <PillowCard variant="strong">
            {timeline.map((item, index) => (
              <View key={item.label} style={[styles.timelineRow, index > 0 && styles.divider]}>
                <View style={styles.timelineDot} />
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>{item.label}</Text>
                  <Text style={styles.rowBody}>{item.body}</Text>
                </View>
              </View>
            ))}
          </PillowCard>
        </View>

        <View style={styles.section}>
          <SectionHeading>Choose your preview</SectionHeading>
          {paywallPlans.map((plan) => (
            <SettingsRow
              accessibilityLabel={`${plan.label}, ${plan.price}${selectedPlan === plan.id ? ', selected' : ''}`}
              key={plan.id}
              onPress={() => onSelectPlan(plan.id)}
              selected={selectedPlan === plan.id}
              showChevron={false}
              subtitle={[plan.renewal, plan.badge].filter(Boolean).join(' · ')}
              title={plan.label}
              trailing={<Text style={[styles.planPrice, selectedPlan === plan.id && styles.planPriceSelected]}>{plan.price}</Text>}
            />
          ))}
          <PillButton fullWidth label={selected.cta} onPress={() => setOverlay('purchase')} variant="screen" />
          <Text style={styles.renewal}>{selected.renewal}</Text>
          <PrototypeNotice>{paywallCopy.prototypeDisclosure}</PrototypeNotice>
        </View>

        <View style={styles.section}>
          <PillButton fullWidth label={paywallCopy.includedLink} onPress={() => setOverlay('included')} variant="secondary" />
          <View style={styles.proofGrid}>
            {paywallProofCards.map((proof) => <PillowCard key={proof}><Text style={styles.proof}>{proof}</Text></PillowCard>)}
          </View>
          <PillButton fullWidth label={selected.cta} onPress={() => setOverlay('purchase')} variant="screen" />
          <Text style={styles.renewal}>{selected.renewal}</Text>
        </View>

        <View style={styles.links}>
          <PillButton label={paywallCopy.restore} onPress={() => setOverlay('restore-choice')} variant="text" />
          <PillButton label={paywallCopy.terms} onPress={() => onOpenLegal('terms')} variant="text" />
          <PillButton label={paywallCopy.privacy} onPress={() => onOpenLegal('privacy')} variant="text" />
        </View>
      </FeatureScaffold>

      <AccessibleModal
        accessibilityTitle={modalTitle}
        contentContainerStyle={styles.modalPage}
        onRequestClose={() => setOverlay(null)}
        scrollEnabled={false}
        style={styles.modalBackdrop}
        visible={overlay !== null}
      >
        <PillowCard style={[styles.modalCard, styles.modalCardFull]} variant="light">
          <View style={[styles.modalScroll, styles.modalScrollFull]}>
            {overlay === 'included' ? (
              <FullScreenModalPage footer={<PillButton fullWidth label="Done" onPress={() => setOverlay(null)} variant="screen" />}>
                <View style={styles.featureList}>
                  {premiumFeatures.map((feature) => (
                    <View key={feature.id} style={styles.featureRow}>
                      <IconChip size="md" source={assetRegistry.glyphs['icon-sparkle']} variant="primary" />
                      <View style={styles.flex}>
                        <Text style={styles.modalRowTitle}>{feature.title}</Text>
                        <Text style={styles.modalBody}>{feature.body}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </FullScreenModalPage>
            ) : overlay === 'restore-choice' ? (
              <FullScreenModalPage contentAlignment="top" footer={<PillButton fullWidth label="Cancel" onPress={() => setOverlay(null)} variant="text" />}>
                <View style={styles.modalOptions}>
                  <PillButton fullWidth label="Preview restored purchase" onPress={() => { setRestoreOutcome('restored'); setOverlay('restore-loading'); }} variant="dark" />
                  <PillButton fullWidth label="Preview nothing to restore" onPress={() => { setRestoreOutcome('none'); setOverlay('restore-loading'); }} variant="secondary" />
                </View>
              </FullScreenModalPage>
            ) : overlay === 'restore-loading' ? (
              <FullScreenModalPage body={restoreFixtures.loading.body} footer={<PillButton fullWidth label={restoreFixtures.loading.action} onPress={() => setOverlay(null)} variant="text" />}>
                <PillButton fullWidth label="Checking sample purchases" loading onPress={() => undefined} variant="dark" />
              </FullScreenModalPage>
            ) : overlay === 'restore-restored' ? (
              <FullScreenModalPage body={restoreFixtures.restored.body} footer={<PillButton
                  fullWidth
                  label={restoreFixtures.restored.action}
                  onPress={() => {
                    setOverlay(null);
                    onRestoreComplete();
                  }}
                  variant="screen"
                />}
              />
            ) : overlay === 'restore-none' ? (
              <FullScreenModalPage body={restoreFixtures.none.body} footer={<PillButton fullWidth label="OK" onPress={() => setOverlay(null)} variant="screen" />} />
            ) : overlay === 'success' ? (
              <FullScreenModalPage body={purchasePreview.success.body} footer={<PillButton
                  fullWidth
                  label={purchasePreview.success.action}
                  onPress={() => {
                    setOverlay(null);
                    onPurchaseComplete(selectedPlan);
                  }}
                  variant="screen"
                />}
              />
            ) : overlay === 'failure' ? (
              <FullScreenModalPage body={purchasePreview.failure.body} footer={<>
                <PillButton fullWidth label={purchasePreview.failure.actions[0]} onPress={() => setOverlay('purchase')} variant="screen" />
                <PillButton fullWidth label={purchasePreview.failure.actions[1]} onPress={() => setOverlay(null)} variant="text" />
              </>} />
            ) : (
              <FullScreenModalPage
                footer={(
                  <>
                    <PillButton
                      accessibilityLabel={overlay === 'loading' ? purchasePreview.processing.accessibilityStatus : purchasePreview.primary}
                      fullWidth
                      label={purchasePreview.primary}
                      loading={overlay === 'loading'}
                      loadingLabel={purchasePreview.processing.cta}
                      onPress={() => setOverlay('loading')}
                      variant="screen"
                    />
                    {overlay !== 'loading' || fixtureOverlay === 'loading' ? (
                      <PillButton fullWidth label={purchasePreview.secondary} onPress={() => setOverlay(null)} variant="text" />
                    ) : null}
                  </>
                )}
              >
                <Text style={styles.modalBody}>{selectedPlan === 'annual' ? purchasePreview.annualLine : purchasePreview.monthlyLine}</Text>
                <Text style={styles.storeAccount}>{purchasePreview.account}</Text>
                <Text style={styles.disclosure}>{purchasePreview.disclosure}</Text>
              </FullScreenModalPage>
            )}
          </View>
        </PillowCard>
      </AccessibleModal>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { ...type.label, alignSelf: 'flex-start', color: colors.text.primary, marginLeft: space[4], marginTop: -space[2] },
  badgeLight: { color: colors.text.primary },
  body: { ...type.body, color: colors.text.secondary, textAlign: 'center' },
  disclosure: { ...type.caption, color: colors.text.ink },
  divider: { borderTopColor: colors.surface.divider, borderTopWidth: 1 },
  eyebrow: { ...type.micro, color: colors.brand.signatureAmber, textAlign: 'center', textTransform: 'uppercase' },
  featureRow: { alignItems: 'center', flexDirection: 'row', gap: space[3] },
  featureList: { gap: space[4] },
  flex: { flex: 1 },
  hero: { height: 210, width: 240 },
  heroBlock: { alignItems: 'center', gap: space[3], paddingBottom: space[4], paddingTop: space[5] },
  ink: { color: colors.text.ink },
  links: { alignItems: 'center', gap: space[1], paddingBottom: space[8] },
  modalBackdrop: { flex: 1 },
  modalBody: { ...type.body, color: colors.text.ink },
  modalCard: { gap: space[4], padding: space[5] },
  modalCardFull: { flex: 1, paddingBottom: 0, paddingTop: 0 },
  modalEyebrow: { ...type.micro, color: colors.text.primary, textTransform: 'uppercase' },
  modalRowTitle: { ...type.cardTitle, color: colors.text.ink },
  modalScroll: { gap: space[4] },
  modalScrollFull: { flex: 1 },
  modalOptions: { gap: space[3] },
  modalPage: { flex: 1 },
  planCard: { padding: 0 },
  planPrice: { ...type.bodyEmphasis, color: colors.text.primary },
  planPriceSelected: { color: colors.brand.primary },
  proof: { ...type.bodyEmphasis, color: colors.text.primary, textAlign: 'center' },
  proofGrid: { gap: space[2] },
  renewal: { ...type.caption, color: colors.text.secondary, textAlign: 'center' },
  rowBody: { ...type.caption, color: colors.text.secondary },
  rowTitle: { ...type.cardTitle, color: colors.text.primary },
  screen: { flex: 1 },
  section: { gap: space[3], marginTop: space[7] },
  storeAccount: { ...type.label, color: colors.text.ink },
  timelineDot: { backgroundColor: colors.brand.signatureAmber, borderRadius: radius.pill, height: 10, marginTop: space[1], width: 10 },
  timelineRow: { flexDirection: 'row', gap: space[3], paddingVertical: space[3] },
  title: { ...type.screenLarge, color: colors.text.primary, textAlign: 'center' },
});
