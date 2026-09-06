import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  baseAllowanceCopy,
  rolloverOptions,
  rulesHubCopy,
  streakPolicyCopy,
  streakPolicyOptions,
  todayOverrideCopy,
} from '@/content';
import {
  DottedSeparator,
  GradientScreen,
  PillButton,
  PillowCard,
  SettingsRow,
  SwitchRow,
  colors,
  radius,
  space,
  type,
} from '@/design-system';

import { ChoiceRow, Intro, ManageSheet, ScreenHeader, SectionLabel, manageFeatureStyles as s } from './components';

export type RuleDestination = 'allowance' | 'rollover' | 'streak' | 'weekly' | 'gyms';

export interface RulesHubScreenProps {
  onBack: () => void;
  onOpenRule: (destination: RuleDestination) => void;
  onOpenTodayOverride: () => void;
  todayValue?: string;
  values?: Partial<Record<RuleDestination, string>>;
}

export function RulesHubScreen({ onBack, onOpenRule, onOpenTodayOverride, todayValue, values = {} }: RulesHubScreenProps) {
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader onBack={onBack} title={rulesHubCopy.title} />
        <Intro body={rulesHubCopy.body} />
        <PillowCard padding="none" variant="grouped">
          {rulesHubCopy.rows.map((row, index) => (
            <View key={row.id}>
              {index > 0 ? <DottedSeparator /> : null}
              <SettingsRow
                onPress={() => onOpenRule(row.id as RuleDestination)}
                title={row.label}
                value={values[row.id as RuleDestination] ?? ('value' in row ? row.value : row.showcaseValue)}
              />
            </View>
          ))}
        </PillowCard>
        <SectionLabel>{rulesHubCopy.todaySection}</SectionLabel>
        <PillowCard padding="none" variant="grouped">
          <SettingsRow
            onPress={onOpenTodayOverride}
            subtitle="Local override preview · reason required"
            title={rulesHubCopy.todayRow.label}
            value={todayValue ?? rulesHubCopy.todayRow.value}
          />
        </PillowCard>
      </ScrollView>
    </GradientScreen>
  );
}

export interface BaseAllowanceScreenProps {
  onBack: () => void;
  onDone: () => void;
  onSelect: (value: number | 'unlimited') => void;
  selected: number | 'unlimited' | null;
}

export function BaseAllowanceScreen({ onBack, onDone, onSelect, selected }: BaseAllowanceScreenProps) {
  const options: readonly (number | 'unlimited')[] = [
    ...Array.from({ length: 49 }, (_, index) => index * 5),
    'unlimited',
  ];
  const consequence = selected === 0
    ? baseAllowanceCopy.zeroConsequence
    : selected === 'unlimited'
      ? baseAllowanceCopy.unlimitedConsequence
      : selected === null
        ? 'Choose an amount to preview how the sample balance would begin each day.'
        : `The sample apps would use ${selected} minutes, then wait for the next earn.`;
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader onBack={onBack} title={baseAllowanceCopy.title} />
        <Intro body={baseAllowanceCopy.body} />
        <PillowCard><Text style={s.body}>{consequence}</Text></PillowCard>
        <View accessibilityLabel="Daily free allowance" accessibilityRole="radiogroup" style={s.cardGap}>
          {options.map((value) => (
            <ChoiceRow
              key={String(value)}
              label={value === 'unlimited' ? 'Unlimited' : value === 0 ? '0 · Full Lock' : `${value} min`}
              onPress={() => onSelect(value)}
              selected={selected === value}
            />
          ))}
        </View>
        <PillButton disabled={selected === null} fullWidth label="Done" onPress={onDone} variant="screen" />
        <PillButton fullWidth label="Cancel" onPress={onBack} variant="text" />
      </ScrollView>
    </GradientScreen>
  );
}

export interface RolloverScreenProps {
  capMinutes: number | null;
  enabled: boolean;
  onBack: () => void;
  onDone: () => void;
  onSelectCap: (minutes: number) => void;
  onToggle: (enabled: boolean) => void;
}

export function RolloverScreen({ capMinutes, enabled, onBack, onDone, onSelectCap, onToggle }: RolloverScreenProps) {
  const [capSheetOpen, setCapSheetOpen] = useState(false);
  const [capDraft, setCapDraft] = useState(capMinutes ?? 60);
  const capOptions = Array.from({ length: 8 }, (_, index) => (index + 1) * 30);
  const capLabel = capMinutes === null
    ? 'the cap you choose'
    : capMinutes % 60 === 0
      ? `${capMinutes / 60} ${capMinutes === 60 ? 'hour' : 'hours'}`
      : `${Math.floor(capMinutes / 60)} hour${capMinutes > 90 ? 's' : ''} 30 minutes`;

  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader onBack={onBack} title={rolloverOptions.title} />
        <Intro body={rolloverOptions.body} />
        <PillowCard padding="none" variant="grouped">
          <SwitchRow
            onValueChange={onToggle}
            subtitle={enabled ? rolloverOptions.modes[1].subtitle : rolloverOptions.modes[0].subtitle}
            title="Carry some forward"
            value={enabled}
          />
          {enabled ? (
            <>
              <DottedSeparator />
              <SettingsRow
                onPress={() => {
                  setCapDraft(capMinutes ?? 60);
                  setCapSheetOpen(true);
                }}
                subtitle="30 min–4 h · 30-minute steps"
                title={rolloverOptions.dependentRow.label}
                value={capMinutes ? `${capMinutes} min` : 'Choose'}
              />
            </>
          ) : null}
        </PillowCard>
        <PillowCard><Text style={s.body}>{enabled ? `Up to ${capLabel} of unused balance would carry into the next allowance day.` : rolloverOptions.offSentence}</Text></PillowCard>
        <PillButton disabled={enabled && capMinutes === null} fullWidth label="Done" onPress={onDone} variant="screen" />
        <PillButton fullWidth label="Cancel" onPress={onBack} variant="text" />
      </ScrollView>
      <ManageSheet
        onCancel={() => setCapSheetOpen(false)}
        onDone={() => {
          onSelectCap(capDraft);
          setCapSheetOpen(false);
        }}
        title="Choose a rollover cap"
        visible={capSheetOpen}
      >
        <Text style={s.note}>Unused time can carry forward only up to this amount.</Text>
        <View accessibilityLabel="Rollover cap" accessibilityRole="radiogroup" style={s.cardGap}>
          {capOptions.map((minutes) => (
            <ChoiceRow
              key={minutes}
              label={minutes % 60 === 0 ? `${minutes / 60} h` : minutes > 60 ? `${Math.floor(minutes / 60)} h 30 min` : `${minutes} min`}
              onPress={() => setCapDraft(minutes)}
              selected={capDraft === minutes}
            />
          ))}
        </View>
      </ManageSheet>
    </GradientScreen>
  );
}

export interface StreakPolicyScreenProps {
  onBack: () => void;
  onLearnMore: () => void;
  onSelect: (value: 'hard-reset' | 'auto-cushion') => void;
  selected: 'hard-reset' | 'auto-cushion';
}

export function StreakPolicyScreen({ onBack, onLearnMore, onSelect, selected }: StreakPolicyScreenProps) {
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader onBack={onBack} title={streakPolicyCopy.title} />
        <Intro body={streakPolicyCopy.body} />
        <View accessibilityLabel="Missed active day policy" accessibilityRole="radiogroup" style={s.cardGap}>
          {streakPolicyOptions.map((option) => (
            <ChoiceRow key={option.id} label={option.label} onPress={() => onSelect(option.id)} selected={selected === option.id} subtitle={option.subtitle} />
          ))}
        </View>
        <PillButton label={streakPolicyCopy.learnMoreAction} onPress={onLearnMore} variant="secondary" />
      </ScrollView>
    </GradientScreen>
  );
}

export interface TodayOverrideScreenProps {
  onBack: () => void;
  onConfirmPreview: () => void;
  onReasonChange: (reason: string) => void;
  reason: string;
}

export function TodayOverrideScreen({ onBack, onConfirmPreview, onReasonChange, reason }: TodayOverrideScreenProps) {
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenHeader onBack={onBack} title={todayOverrideCopy.title} />
        <Intro body={todayOverrideCopy.body} label="PROTOTYPE CONFIRMATION PREVIEW" />
        <PillowCard>
          <Text style={styles.inputLabel}>Why do you need today off?</Text>
          <TextInput
            accessibilityLabel="Rest day reason"
            maxLength={180}
            multiline
            onChangeText={onReasonChange}
            placeholder={todayOverrideCopy.placeholder}
            placeholderTextColor={colors.text.tertiary}
            style={styles.reasonInput}
            textAlignVertical="top"
            value={reason}
          />
          <Text accessibilityLiveRegion="polite" style={styles.characterCount}>{reason.length}/180</Text>
        </PillowCard>
        <PillButton disabled={!reason.trim()} fullWidth label={todayOverrideCopy.primary} onPress={onConfirmPreview} variant="screen" />
        <Text style={s.note}>This opens a local confirmation preview. No calendar or device setting changes.</Text>
      </ScrollView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  characterCount: { ...type.caption, color: colors.text.secondary, textAlign: 'right' },
  inputLabel: { ...type.label, color: colors.text.primary, marginBottom: space[2] },
  reasonInput: {
    ...type.body,
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.divider,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text.primary,
    minHeight: 112,
    padding: space[3],
  },
});
