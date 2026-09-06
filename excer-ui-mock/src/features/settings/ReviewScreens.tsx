import { StyleSheet, Text, View } from 'react-native';

import { rateCopy, reviewLifecycleStates } from '@/content';
import {
  GradientScreen,
  PillButton,
  PillowCard,
  SelectableBubble,
  colors,
  layout,
  radius,
  space,
  type,
} from '@/design-system';
import type { ReviewPromptState, ReviewTrigger } from '@/presentation';

import { PrototypeLabel, SettingsHeader, settingsFeatureStyles as s } from './components';

export interface RatePreviewScreenProps {
  onBack: () => void;
  onNotNow: () => void;
  onOpenPrompt: () => void;
}

export function RatePreviewScreen({ onBack, onNotNow, onOpenPrompt }: RatePreviewScreenProps) {
  return (
    <GradientScreen variant="detail">
      <View style={s.content}>
        <SettingsHeader onBack={onBack} title={rateCopy.title} />
        <PrototypeLabel>APP STORE REVIEW PREVIEW</PrototypeLabel>
        <PillowCard style={s.cardGap} variant="elevated">
          <Text style={s.sectionTitle}>{rateCopy.title}</Text>
          <Text style={s.body}>{rateCopy.body}</Text>
        </PillowCard>
        <Text style={s.note}>{rateCopy.manualConsequence}</Text>
        <View style={styles.bottomActions}>
          <PillButton fullWidth label={rateCopy.primary} onPress={onOpenPrompt} variant="screen" />
          <PillButton fullWidth label={rateCopy.secondary} onPress={onNotNow} variant="text" />
        </View>
      </View>
    </GradientScreen>
  );
}

export interface ReviewPromptScreenProps {
  complete?: boolean;
  fixtureState?: ReviewPromptState;
  onDismiss: () => void;
  onDone: () => void;
  onSelectStars: (stars: number) => void;
  onSubmit: () => void;
  stars: number | null;
  trigger?: ReviewTrigger | null;
}

const triggerLabels: Record<ReviewTrigger, string> = {
  fifthUnlock: 'Fifth unlock',
  sevenDays: 'First seven-day streak',
  thirtyDays: 'Thirty-day streak',
};

function lifecycleFixtureId(state: ReviewPromptState, trigger: ReviewTrigger | null | undefined) {
  if (state === 'eligible') {
    if (trigger === 'sevenDays') return 'eligible-second';
    if (trigger === 'thirtyDays') return 'eligible-third';
    return 'eligible-first';
  }
  if (state === 'suppressedAfterShield') return 'suppressed-shield';
  if (state === 'stoppedAfterThree') return 'stopped-three';
  return state;
}

export function ReviewPromptScreen({
  complete = false,
  fixtureState = 'presented',
  onDismiss,
  onDone,
  onSelectStars,
  onSubmit,
  stars,
  trigger,
}: ReviewPromptScreenProps) {
  const visibleState: ReviewPromptState = complete ? 'rated' : fixtureState;
  const lifecycle = reviewLifecycleStates.find((item) => item.id === lifecycleFixtureId(visibleState, trigger));

  if (visibleState !== 'presented' && visibleState !== 'rated') {
    return (
      <GradientScreen variant="night">
        <View style={styles.promptScreen}>
          <View style={styles.previewDisclosure}>
            <PrototypeLabel>REVIEW LIFECYCLE FIXTURE</PrototypeLabel>
            <Text style={s.note}>No StoreKit review request or rating is created.</Text>
          </View>
          <View style={styles.promptCenter}>
            <PillowCard style={styles.lifecycleCard} variant="elevated">
              <Text style={styles.lifecycleState}>{visibleState.replace(/([A-Z])/g, ' $1').toUpperCase()}</Text>
              <Text style={styles.systemTitle}>{lifecycle?.status ?? 'Review preview state'}</Text>
              <Text style={styles.systemBody}>{lifecycle?.result ?? 'This deterministic fixture stays inside the prototype.'}</Text>
              {trigger ? <Text style={s.note}>Trigger · {triggerLabels[trigger]}</Text> : null}
              <PillButton fullWidth label="Done" onPress={onDone} variant="screen" />
            </PillowCard>
          </View>
        </View>
      </GradientScreen>
    );
  }

  return (
    <GradientScreen variant="night">
      <View style={styles.promptScreen}>
        <View style={styles.previewDisclosure}>
          <PrototypeLabel>{visibleState === 'rated' ? 'REVIEW RESULT FIXTURE' : 'SIMULATED NATIVE REVIEW'}</PrototypeLabel>
          <Text style={s.note}>{rateCopy.prompt.disclosure}</Text>
          {trigger ? <Text style={s.note}>Trigger · {triggerLabels[trigger]}</Text> : null}
        </View>
        <View style={styles.promptCenter}>
          <View accessibilityViewIsModal style={styles.systemCard}>
            <Text style={styles.systemTitle}>{visibleState === 'rated' ? rateCopy.terminal.title : rateCopy.prompt.title}</Text>
            <Text style={styles.systemBody}>{visibleState === 'rated' ? rateCopy.terminal.body : rateCopy.prompt.body}</Text>
            {visibleState !== 'rated' ? (
              <View accessibilityLabel="Sample star rating" accessibilityRole="radiogroup" style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <SelectableBubble
                    accessibilityLabel={`${star} star${star === 1 ? '' : 's'}`}
                    compact
                    contentStyle={styles.starTarget}
                    key={star}
                    label="★"
                    labelStyle={styles.star}
                    onPress={() => onSelectStars(star)}
                    role="radio"
                    selected={stars === star}
                  />
                ))}
              </View>
            ) : null}
            {visibleState === 'rated' ? (
              <PillButton fullWidth label={rateCopy.terminal.action} onPress={onDone} variant="primary" />
            ) : (
              <View style={styles.systemActions}>
                <PillButton label={rateCopy.prompt.actions[0]} onPress={onDismiss} variant="screen" />
                <PillButton disabled={stars === null} label={rateCopy.prompt.actions[1]} onPress={onSubmit} variant="primary" />
              </View>
            )}
          </View>
        </View>
      </View>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  bottomActions: { gap: space[2], marginTop: 'auto' },
  lifecycleCard: { gap: space[4] },
  lifecycleState: { ...type.label, color: colors.text.primary },
  previewDisclosure: { alignItems: 'center', gap: space[1] },
  promptCenter: { flex: 1, justifyContent: 'center' },
  promptScreen: { flex: 1, gap: space[4], paddingBottom: space[4], paddingTop: space[2] },
  star: { ...type.screenTitle },
  starTarget: { alignItems: 'center', height: layout.controlHeightCompact, justifyContent: 'center', width: layout.controlHeightCompact },
  stars: { flexDirection: 'row', justifyContent: 'center' },
  systemActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], justifyContent: 'flex-end' },
  systemBody: { ...type.body, color: colors.text.ink, textAlign: 'center' },
  systemCard: { backgroundColor: colors.surface.bubble, borderColor: colors.surface.bubbleBorder, borderRadius: radius.cardLarge, borderWidth: 1, gap: space[4], padding: space[5] },
  systemTitle: { ...type.sectionTitle, color: colors.text.ink, textAlign: 'center' },
});
