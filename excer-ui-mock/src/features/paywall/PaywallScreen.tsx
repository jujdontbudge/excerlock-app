import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  AccessibleModal,
  AccessibleModalTitle,
  IconChip,
  PillowCard,
  PillButton,
  SettingsRow,
  colors,
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
    : overlay === 'restore-choice' || overlay === 'restore-loading'
      ? 'Restore purchases preview'
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
    <>
      <FeatureScaffold accessibilityLabel={paywallCopy.title}>
        <View style={styles.heroBlock}>
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={require('../../../assets/heroes/paywall-hero.png')}
            style={styles.hero}
          />
          <Text style={styles.eyebrow}>{paywallCopy.eyebrow}</Text>
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
            <PillowCard key={plan.id} style={styles.planCard} variant={selectedPlan === plan.id ? 'light' : 'strong'}>
              <SettingsRow
                accessibilityLabel={`${plan.label}, ${plan.price}${selectedPlan === plan.id ? ', selected' : ''}`}
                onPress={() => onSelectPlan(plan.id)}
                showChevron={false}
                subtitle={plan.renewal}
                title={plan.label}
                tone={selectedPlan === plan.id ? 'light' : 'dark'}
                trailing={<Text style={[styles.planPrice, selectedPlan === plan.id && styles.ink]}>{plan.price}</Text>}
                value={selectedPlan === plan.id ? '✓' : undefined}
              />
              {plan.badge ? <Text style={[styles.badge, selectedPlan === plan.id && styles.badgeLight]}>{plan.badge}</Text> : null}
            </PillowCard>
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
        animationType="slide"
        onRequestClose={() => setOverlay(null)}
        style={styles.modalBackdrop}
        visible={overlay !== null}
      >
        <PillowCard style={styles.modalCard} variant="light">
          <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {overlay === 'included' ? (
              <>
                <AccessibleModalTitle style={styles.modalTitle}>What’s included</AccessibleModalTitle>
                {premiumFeatures.map((feature) => (
                  <View key={feature.id} style={styles.featureRow}>
                    <IconChip size="md" source={require('../../../assets/glyphs/icon-sparkle.png')} variant="primary" />
                    <View style={styles.flex}>
                      <Text style={styles.modalRowTitle}>{feature.title}</Text>
                      <Text style={styles.modalBody}>{feature.body}</Text>
                    </View>
                  </View>
                ))}
                <PillButton fullWidth label="Done" onPress={() => setOverlay(null)} variant="dark" />
              </>
            ) : overlay === 'restore-choice' ? (
              <>
                <Text style={styles.modalEyebrow}>DETERMINISTIC LOCAL RESTORE</Text>
                <AccessibleModalTitle style={styles.modalTitle}>Choose a restore result</AccessibleModalTitle>
                <Text style={styles.modalBody}>Both outcomes are local fixtures. No receipt, App Store account, or network service is checked.</Text>
                <PillButton
                  fullWidth
                  label="Preview restored purchase"
                  onPress={() => {
                    setRestoreOutcome('restored');
                    setOverlay('restore-loading');
                  }}
                  variant="dark"
                />
                <PillButton
                  fullWidth
                  label="Preview nothing to restore"
                  onPress={() => {
                    setRestoreOutcome('none');
                    setOverlay('restore-loading');
                  }}
                  variant="secondary"
                />
                <PillButton fullWidth label="Cancel" onPress={() => setOverlay(null)} variant="text" />
              </>
            ) : overlay === 'restore-loading' ? (
              <>
                <Text style={styles.modalEyebrow}>LOCAL RESTORE PREVIEW</Text>
                <AccessibleModalTitle style={styles.modalTitle}>{restoreFixtures.loading.title}</AccessibleModalTitle>
                <Text style={styles.modalBody}>{restoreFixtures.loading.body}</Text>
                <PillButton fullWidth label="Checking sample purchases" loading onPress={() => undefined} variant="dark" />
                <PillButton fullWidth label={restoreFixtures.loading.action} onPress={() => setOverlay(null)} variant="text" />
              </>
            ) : overlay === 'restore-restored' ? (
              <>
                <Text style={styles.modalEyebrow}>LOCAL RESTORE RESULT</Text>
                <AccessibleModalTitle style={styles.modalTitle}>{restoreFixtures.restored.title}</AccessibleModalTitle>
                <Text style={styles.modalBody}>{restoreFixtures.restored.body}</Text>
                <PillButton
                  fullWidth
                  label={restoreFixtures.restored.action}
                  onPress={() => {
                    setOverlay(null);
                    onRestoreComplete();
                  }}
                  variant="dark"
                />
              </>
            ) : overlay === 'restore-none' ? (
              <>
                <Text style={styles.modalEyebrow}>Prototype preview</Text>
                <AccessibleModalTitle style={styles.modalTitle}>{restoreFixtures.none.title}</AccessibleModalTitle>
                <Text style={styles.modalBody}>{restoreFixtures.none.body}</Text>
                <PillButton fullWidth label="OK" onPress={() => setOverlay(null)} variant="dark" />
              </>
            ) : overlay === 'success' ? (
              <>
                <Text style={styles.modalEyebrow}>Subscribed in demo</Text>
                <AccessibleModalTitle style={styles.modalTitle}>{purchasePreview.success.title}</AccessibleModalTitle>
                <Text style={styles.modalBody}>{purchasePreview.success.body}</Text>
                <PillButton
                  fullWidth
                  label={purchasePreview.success.action}
                  onPress={() => {
                    setOverlay(null);
                    onPurchaseComplete(selectedPlan);
                  }}
                  variant="dark"
                />
              </>
            ) : overlay === 'failure' ? (
              <>
                <Text style={styles.modalEyebrow}>Prototype purchase preview</Text>
                <AccessibleModalTitle style={styles.modalTitle}>{purchasePreview.failure.title}</AccessibleModalTitle>
                <Text style={styles.modalBody}>{purchasePreview.failure.body}</Text>
                <PillButton fullWidth label={purchasePreview.failure.actions[0]} onPress={() => setOverlay('purchase')} variant="dark" />
                <PillButton fullWidth label={purchasePreview.failure.actions[1]} onPress={() => setOverlay(null)} variant="text" />
              </>
            ) : (
              <>
                <Text style={styles.modalEyebrow}>Prototype purchase preview</Text>
                <AccessibleModalTitle style={styles.modalTitle}>{purchasePreview.product}</AccessibleModalTitle>
                <Text style={styles.modalBody}>{selectedPlan === 'annual' ? purchasePreview.annualLine : purchasePreview.monthlyLine}</Text>
                <Text style={styles.storeAccount}>{purchasePreview.account}</Text>
                <Text style={styles.disclosure}>{purchasePreview.disclosure}</Text>
                <PillButton
                  accessibilityLabel={overlay === 'loading'
                    ? purchasePreview.processing.accessibilityStatus
                    : purchasePreview.primary}
                  fullWidth
                  label={purchasePreview.primary}
                  loading={overlay === 'loading'}
                  loadingLabel={purchasePreview.processing.cta}
                  onPress={() => setOverlay('loading')}
                  variant="dark"
                />
                {overlay !== 'loading' || fixtureOverlay === 'loading' ? (
                  <PillButton fullWidth label={purchasePreview.secondary} onPress={() => setOverlay(null)} variant="text" />
                ) : null}
              </>
            )}
          </ScrollView>
        </PillowCard>
      </AccessibleModal>
    </>
  );
}

const styles = StyleSheet.create({
  badge: { ...type.micro, alignSelf: 'flex-start', color: colors.brand.signatureAmber, marginLeft: space[4], marginTop: -space[2] },
  badgeLight: { color: colors.brand.burnt },
  body: { ...type.body, color: colors.text.secondary, textAlign: 'center' },
  disclosure: { ...type.caption, color: colors.text.ink, opacity: 0.62 },
  divider: { borderTopColor: colors.surface.divider, borderTopWidth: StyleSheet.hairlineWidth },
  eyebrow: { ...type.micro, color: colors.brand.signatureAmber, textAlign: 'center', textTransform: 'uppercase' },
  featureRow: { alignItems: 'center', flexDirection: 'row', gap: space[3] },
  flex: { flex: 1 },
  hero: { height: 210, width: 240 },
  heroBlock: { alignItems: 'center', gap: space[3], paddingBottom: space[4], paddingTop: space[5] },
  ink: { color: colors.text.ink },
  links: { alignItems: 'center', gap: space[1], paddingBottom: space[8] },
  modalBackdrop: { backgroundColor: colors.surface.scrim, flex: 1, justifyContent: 'flex-end', padding: space[3] },
  modalBody: { ...type.body, color: colors.text.ink, opacity: 0.72 },
  modalCard: { gap: space[4], maxHeight: '88%', padding: space[5] },
  modalEyebrow: { ...type.micro, color: colors.brand.burnt, textTransform: 'uppercase' },
  modalRowTitle: { ...type.cardTitle, color: colors.text.ink },
  modalScroll: { gap: space[4] },
  modalTitle: { ...type.screenTitle, color: colors.text.ink },
  planCard: { padding: 0 },
  planPrice: { ...type.bodyEmphasis, color: colors.text.primary },
  proof: { ...type.bodyEmphasis, color: colors.text.primary, textAlign: 'center' },
  proofGrid: { gap: space[2] },
  renewal: { ...type.caption, color: colors.text.secondary, textAlign: 'center' },
  rowBody: { ...type.caption, color: colors.text.secondary },
  rowTitle: { ...type.cardTitle, color: colors.text.primary },
  section: { gap: space[3], marginTop: space[7] },
  storeAccount: { ...type.label, color: colors.text.ink },
  timelineDot: { backgroundColor: colors.brand.signatureAmber, borderRadius: 5, height: 10, marginTop: space[1], width: 10 },
  timelineRow: { flexDirection: 'row', gap: space[3], paddingVertical: space[3] },
  title: { ...type.screenLarge, color: colors.text.primary, textAlign: 'center' },
});
