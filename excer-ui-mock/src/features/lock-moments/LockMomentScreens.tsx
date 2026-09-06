import { StyleSheet, Text, View } from 'react-native';

import { lowTimeNotice, shieldVariants, timeOutNotice } from '@/content';
import {
  GradientScreen,
  HeroLock,
  PillButton,
  PillowCard,
  PressableScale,
  colors,
  radius,
  space,
  type,
} from '@/design-system';

export type ShieldVariantId = (typeof shieldVariants)[number]['id'];

export interface LowTimeBannerProps {
  onDismiss: () => void;
  onEarnMore: () => void;
  onOpenBalance: () => void;
}

export function LowTimeBanner({ onDismiss, onEarnMore, onOpenBalance }: LowTimeBannerProps) {
  return (
    <PillowCard style={styles.lowBanner} variant="elevated">
      <PressableScale accessibilityLabel="Open balance details" accessibilityRole="button" onPress={onOpenBalance} style={styles.lowCopyHost}>
        <View style={styles.lowCopy}>
          <View accessibilityElementsHidden style={styles.attentionDot} />
          <View style={styles.flex}>
            <Text style={styles.lowTitle}>{lowTimeNotice.title}</Text>
            <Text style={styles.lowBody}>{lowTimeNotice.body}</Text>
          </View>
        </View>
      </PressableScale>
      <View style={styles.bannerActions}>
        <PillButton label={lowTimeNotice.primary} onPress={onEarnMore} variant="energy" />
        <PillButton label={lowTimeNotice.secondary} onPress={onDismiss} variant="text" />
      </View>
    </PillowCard>
  );
}

export interface TimeOutScreenProps {
  body: string;
  helper?: string;
  onBackHome?: () => void;
  onPrimary: () => void;
  onSeeAll?: () => void;
  primaryLabel: string;
}

export function TimeOutScreen({
  body,
  helper,
  onBackHome,
  onPrimary,
  onSeeAll,
  primaryLabel,
}: TimeOutScreenProps) {
  return (
    <GradientScreen variant="night">
      <View style={styles.timeOut}>
        <View style={styles.timeOutHero}>
          <HeroLock accessibilityLabel="Apps locked in this local preview" size={210} state="locked" />
          <Text style={styles.timeOutTitle}>{timeOutNotice.title}</Text>
          <Text style={styles.timeOutBody}>{body}</Text>
          {helper ? <Text style={styles.timeOutBody}>{helper}</Text> : null}
        </View>
        <View style={styles.actions}>
          <PillButton fullWidth label={primaryLabel} onPress={onPrimary} variant="screen" />
          {onSeeAll ? <PillButton fullWidth label={timeOutNotice.secondary} onPress={onSeeAll} variant="secondary" /> : null}
          {onBackHome ? <PillButton fullWidth label={timeOutNotice.tertiary} onPress={onBackHome} variant="text" /> : null}
        </View>
      </View>
    </GradientScreen>
  );
}

export interface ShieldPreviewScreenProps {
  onClose: () => void;
  onPrimary: (variant: ShieldVariantId) => void;
  subtitle?: string;
  variant: ShieldVariantId;
}

export function ShieldPreviewScreen({ onClose, onPrimary, subtitle, variant }: ShieldPreviewScreenProps) {
  const fixture = shieldVariants.find((item) => item.id === variant) ?? shieldVariants[0];
  return (
    <GradientScreen edgeToEdge variant="home">
      <View accessibilityLabel={fixture.accessibilityLabel} style={styles.shieldScreen}>
        <View style={styles.shieldDisclosure}>
          <Text style={styles.shieldPreviewBody}>No installed app is blocked. No Screen Time state, haptic, or sound is used.</Text>
        </View>
        <View style={styles.shieldHero}>
          <HeroLock accessibilityLabel="Closed ExcerLock sample lock" size={210} state="locked" />
          <Text style={styles.shieldTitle}>{fixture.title}</Text>
          <Text style={styles.shieldSubtitle}>{subtitle ?? fixture.subtitle}</Text>
        </View>
        <View style={styles.actions}>
          <PillButton fullWidth label={fixture.primary} onPress={() => onPrimary(fixture.id)} variant="primary" />
          {fixture.secondary ? <PillButton fullWidth label={fixture.secondary} onPress={onClose} variant="screen" /> : null}
        </View>
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space[2], width: '100%' },
  attentionDot: { backgroundColor: colors.brand.energyAction, borderRadius: radius.pill, height: 12, marginTop: space[1], width: 12 },
  bannerActions: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: space[1], justifyContent: 'flex-end' },
  flex: { flex: 1 },
  lowBanner: { borderColor: colors.brand.energyAction, borderWidth: 1, gap: space[3] },
  lowBody: { ...type.body, color: colors.text.secondary, marginTop: space[1] },
  lowCopy: { alignItems: 'flex-start', flexDirection: 'row', gap: space[3] },
  lowCopyHost: { alignSelf: 'stretch' },
  lowTitle: { ...type.cardTitle, color: colors.text.primary },
  previewLabel: { ...type.micro, color: colors.brand.signatureAmber, textAlign: 'center' },
  shieldDisclosure: { backgroundColor: colors.surface.bubble, borderColor: colors.surface.bubbleBorder, borderRadius: radius.card, borderWidth: 1, gap: space[1], padding: space[3] },
  shieldHero: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: space[4] },
  shieldPreviewBody: { ...type.caption, color: colors.text.ink, textAlign: 'center' },
  shieldPreviewLabel: { ...type.micro, color: colors.brand.burnt, textAlign: 'center' },
  shieldScreen: { flex: 1, gap: space[4], justifyContent: 'space-between', padding: space[5] },
  shieldSubtitle: { ...type.callout, color: colors.text.secondary, marginTop: space[2], maxWidth: 310, textAlign: 'center' },
  shieldTitle: { ...type.screenLarge, color: colors.text.primary, marginTop: space[3], textAlign: 'center' },
  timeOut: { alignItems: 'center', flex: 1, gap: space[4], justifyContent: 'space-between', paddingVertical: space[4] },
  timeOutBody: { ...type.callout, color: colors.text.secondary, maxWidth: 310, textAlign: 'center' },
  timeOutHero: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  timeOutTitle: { ...type.screenLarge, color: colors.text.primary, marginTop: space[3], textAlign: 'center' },
});
