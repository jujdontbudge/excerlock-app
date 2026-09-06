import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  customDayCopy,
  restDayChoices,
  weeklyDayChoices,
  weeklyRulesCopy,
  weeklyRulesFixture,
} from '@/content';
import {
  DottedSeparator,
  GradientScreen,
  PillButton,
  PillowCard,
  PressableScale,
  SelectableBubble,
  SettingsRow,
  SwitchRow,
  colors,
  radius,
  space,
  type,
} from '@/design-system';
import type {
  DemoCondition,
  WeeklyConditionRewardOverride,
  WeeklyRuleConfig,
} from '@/presentation';

import { ChoiceRow, Intro, ManageSheet, ScreenHeader, SectionLabel, manageFeatureStyles as s } from './components';

export type WeekdayId = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type DayMode = 'active' | 'rest' | 'custom';

const weekdays: readonly { id: WeekdayId; short: string }[] = [
  { id: 'monday', short: 'M' },
  { id: 'tuesday', short: 'T' },
  { id: 'wednesday', short: 'W' },
  { id: 'thursday', short: 'T' },
  { id: 'friday', short: 'F' },
  { id: 'saturday', short: 'S' },
  { id: 'sunday', short: 'S' },
];

export interface WeeklyRulesScreenProps {
  dayModes?: Readonly<Record<WeekdayId, DayMode>>;
  lockWindowEnabled: boolean;
  lockWindowFrom: string;
  lockWindowTo: string;
  onAddDayOff: (date: string, label: string) => void;
  onBack: () => void;
  onChangeTime: (edge: 'from' | 'to', value: string) => void;
  onDone: () => void;
  onOpenDay: (day: WeekdayId) => void;
  onRemoveDayOff: (date: string, label: string) => void;
  onToggleLockWindow: (enabled: boolean) => void;
  plannedDaysOff: readonly { date: string; label: string }[];
}

type WeeklyPicker =
  | { kind: 'time'; edge: 'from' | 'to'; draft: string }
  | { kind: 'calendar'; draft: string }
  | null;

const formatClockTime = (minutes: number) => {
  const hour24 = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
};

const shiftClockTime = (value: string, deltaMinutes: number) => {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(value);
  if (!match) return value;
  const [, rawHour, rawMinute, suffix] = match;
  const hour12 = Number(rawHour) % 12;
  const hour24 = hour12 + (suffix === 'PM' ? 12 : 0);
  const current = hour24 * 60 + Number(rawMinute);
  return formatClockTime((current + deltaMinutes + 24 * 60) % (24 * 60));
};

const timeOptions = Array.from({ length: 96 }, (_, index) => formatClockTime(index * 15));
const allowanceOptions = [
  ...Array.from({ length: 49 }, (_, index) => {
    const minutes = index * 5;
    if (minutes === 0) return '0 min · Full Lock';
    if (minutes === 240) return '4 h';
    if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60} h`;
    return `${minutes} min`;
  }),
  'Unlimited',
];
const septemberDays = Array.from({ length: 30 }, (_, index) => index + 1);
const calendarWeekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function MinuteTimeAdjuster({ onChange, value }: { onChange: (value: string) => void; value: string }) {
  return (
    <PillowCard variant="strong">
      <View style={s.row}>
        <View style={s.rowCopy}>
          <Text style={s.label}>SELECTED TIME</Text>
          <Text accessibilityLiveRegion="polite" style={styles.adjustedTime}>{value}</Text>
        </View>
        <View style={s.buttonRow}>
          <PillButton accessibilityLabel="Decrease time by one minute" label="−1 min" onPress={() => onChange(shiftClockTime(value, -1))} variant="secondary" />
          <PillButton accessibilityLabel="Increase time by one minute" label="+1 min" onPress={() => onChange(shiftClockTime(value, 1))} variant="secondary" />
        </View>
      </View>
      <Text style={s.note}>Quarter-hour shortcuts are below. The one-minute controls make every clock time selectable.</Text>
    </PillowCard>
  );
}

function septemberDate(day: number) {
  return `2026-09-${String(day).padStart(2, '0')}`;
}

function septemberLabel(day: number) {
  return new Date(`${septemberDate(day)}T12:00:00Z`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function WeeklyRulesScreen({
  dayModes = {
    monday: weeklyRulesFixture.monday,
    tuesday: weeklyRulesFixture.tuesday,
    wednesday: weeklyRulesFixture.wednesday,
    thursday: weeklyRulesFixture.thursday,
    friday: weeklyRulesFixture.friday,
    saturday: weeklyRulesFixture.saturday,
    sunday: weeklyRulesFixture.sunday,
  },
  lockWindowEnabled,
  lockWindowFrom,
  lockWindowTo,
  onAddDayOff,
  onBack,
  onChangeTime,
  onDone,
  onOpenDay,
  onRemoveDayOff,
  onToggleLockWindow,
  plannedDaysOff,
}: WeeklyRulesScreenProps) {
  const [picker, setPicker] = useState<WeeklyPicker>(null);
  const activeCount = Object.values(dayModes).filter((mode) => mode === 'active').length;
  const restCount = Object.values(dayModes).filter((mode) => mode === 'rest').length;
  const duplicateDate = picker?.kind === 'calendar'
    ? plannedDaysOff.some((day) => day.date === picker.draft)
    : false;

  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader onBack={onBack} title={weeklyRulesCopy.title} />
        <Intro body={`${activeCount} active · ${restCount} rest · ${plannedDaysOff.length} planned ${plannedDaysOff.length === 1 ? 'day' : 'days'} off.`} />
        <View accessibilityLabel="Weekly day rules" style={styles.weekGrid}>
          {weekdays.map((day) => (
            <PressableScale
              accessibilityLabel={`${day.id}, ${dayModes[day.id]}`}
              accessibilityRole="button"
              key={day.id}
              onPress={() => onOpenDay(day.id)}
              style={styles.dayHost}
            >
              <View style={[styles.dayCell, dayModes[day.id] === 'rest' && styles.restCell, dayModes[day.id] === 'custom' && styles.customCell]}>
                <Text style={styles.dayLetter}>{day.short}</Text>
                <Text style={styles.dayMode}>{dayModes[day.id] === 'active' ? 'ON' : dayModes[day.id] === 'rest' ? 'REST' : 'CUSTOM'}</Text>
              </View>
            </PressableScale>
          ))}
        </View>
        <Text style={s.note}>{weeklyRulesCopy.restHelper}</Text>

        <PillowCard padding="none" variant="grouped">
          <SwitchRow
            onValueChange={onToggleLockWindow}
            subtitle={lockWindowEnabled ? `${lockWindowFrom}–${lockWindowTo}` : weeklyRulesCopy.lockWindow.offSubtitle}
            title={weeklyRulesCopy.lockWindow.title}
            value={lockWindowEnabled}
          />
          {lockWindowEnabled ? (
            <>
              <DottedSeparator />
              <SettingsRow onPress={() => setPicker({ kind: 'time', edge: 'from', draft: lockWindowFrom })} title="From" value={lockWindowFrom} />
              <DottedSeparator />
              <SettingsRow onPress={() => setPicker({ kind: 'time', edge: 'to', draft: lockWindowTo })} title="To" value={lockWindowTo} />
            </>
          ) : null}
        </PillowCard>
        <Text style={s.note}>{weeklyRulesCopy.lockWindow.helper}</Text>

        <SectionLabel>{weeklyRulesCopy.plannedDaysOff.sectionTitle}</SectionLabel>
        {plannedDaysOff.length ? (
          <PillowCard padding="none" variant="grouped">
            {plannedDaysOff.map((day, index) => (
              <View key={day.date}>
                {index > 0 ? <DottedSeparator /> : null}
                <SettingsRow
                  onPress={() => onRemoveDayOff(day.date, day.label)}
                  subtitle="Tap to remove with confirmation"
                  title={day.label}
                  value="Rest · Streak unchanged"
                />
              </View>
            ))}
          </PillowCard>
        ) : (
          <PillowCard><Text style={s.body}>{weeklyRulesCopy.plannedDaysOff.empty}</Text></PillowCard>
        )}
        <PillButton
          fullWidth
          label={weeklyRulesCopy.addDateAction}
          onPress={() => setPicker({ kind: 'calendar', draft: septemberDate(7) })}
          variant="secondary"
        />
        <Text style={s.note}>Prototype calendar preview — no calendar data is read or changed.</Text>
        <PillButton fullWidth label={weeklyRulesCopy.primary} onPress={onDone} variant="screen" />
      </ScrollView>
      <ManageSheet
        doneDisabled={picker?.kind === 'calendar' && duplicateDate}
        doneLabel={picker?.kind === 'calendar' ? 'Add day off' : 'Done'}
        onCancel={() => setPicker(null)}
        onDone={() => {
          if (picker?.kind === 'time') onChangeTime(picker.edge, picker.draft);
          if (picker?.kind === 'calendar' && !duplicateDate) {
            const day = Number(picker.draft.slice(-2));
            onAddDayOff(picker.draft, septemberLabel(day));
          }
          setPicker(null);
        }}
        title={picker?.kind === 'calendar' ? weeklyRulesCopy.plannedDaysOff.calendarTitle : weeklyRulesCopy.lockWindow.sheetTitle}
        visible={picker !== null}
      >
        {picker?.kind === 'time' ? (
          <>
            <Text style={s.note}>Local wheel preview · no device schedule is changed.</Text>
            <MinuteTimeAdjuster
              onChange={(value) => setPicker({ ...picker, draft: value })}
              value={picker.draft}
            />
            <View accessibilityLabel={`${picker.edge} time`} accessibilityRole="radiogroup" style={s.cardGap}>
              {timeOptions.map((value) => (
                <ChoiceRow
                  key={value}
                  label={value}
                  onPress={() => setPicker({ ...picker, draft: value })}
                  selected={picker.draft === value}
                />
              ))}
            </View>
          </>
        ) : null}
        {picker?.kind === 'calendar' ? (
          <>
            <Text style={s.body}>{weeklyRulesCopy.plannedDaysOff.calendarBody}</Text>
            <Text style={styles.monthTitle}>September 2026</Text>
            <View accessibilityElementsHidden style={styles.calendarGrid}>
              {calendarWeekdays.map((day, index) => <Text key={`${day}-${index}`} style={styles.weekdayLabel}>{day}</Text>)}
            </View>
            <View accessibilityLabel="September 2026 calendar" style={styles.calendarGrid}>
              {[0, 1].map((blank) => <View key={`blank-${blank}`} style={styles.calendarDayHost} />)}
              {septemberDays.map((day) => {
                const date = septemberDate(day);
                const selected = picker.draft === date;
                const planned = plannedDaysOff.some((item) => item.date === date);
                return (
                  <SelectableBubble
                    accessibilityLabel={`${septemberLabel(day)}${planned ? ', already planned off' : ''}`}
                    compact
                    contentStyle={[styles.calendarDay, planned && styles.plannedDay]}
                    key={date}
                    label={String(day)}
                    onPress={() => setPicker({ kind: 'calendar', draft: date })}
                    role="radio"
                    selected={selected}
                    style={styles.calendarDayHost}
                    trailing={planned ? <View style={styles.plannedDot} /> : undefined}
                  />
                );
              })}
            </View>
            <Text accessibilityLiveRegion="polite" style={duplicateDate ? styles.duplicateNote : s.note}>
              {duplicateDate ? 'That date is already a planned rest day. Choose another date.' : `Selected: ${septemberLabel(Number(picker.draft.slice(-2)))}`}
            </Text>
          </>
        ) : null}
      </ManageSheet>
    </GradientScreen>
  );
}

type RewardPicker =
  | { screen: 'conditions' }
  | { screen: 'choice'; conditionId: string; draft: WeeklyConditionRewardOverride | null }
  | null;

type CustomFieldPicker =
  | { screen: 'allowance'; draft: string }
  | { screen: 'window'; mode: 'all-day' | 'window'; from: string; to: string }
  | { screen: 'window-time'; edge: 'from' | 'to'; from: string; to: string }
  | null;

export interface CustomDayScreenProps {
  conditions: readonly DemoCondition[];
  customValues: WeeklyRuleConfig['customValues'][WeekdayId];
  dayName: string;
  mode: DayMode;
  onBack: () => void;
  onDone: () => void;
  onSetCustomField: (field: 'allowance' | 'window', value: string) => void;
  onSelectMode: (mode: DayMode) => void;
  onSelectRestBehavior: (mode: 'no-locking' | 'allowance-only') => void;
  onSetRewardOverride: (conditionId: string, override: WeeklyConditionRewardOverride | null) => void;
  restBehavior: 'no-locking' | 'allowance-only';
}

export function CustomDayScreen({
  conditions,
  customValues,
  dayName,
  mode,
  onBack,
  onDone,
  onSetCustomField,
  onSelectMode,
  onSelectRestBehavior,
  onSetRewardOverride,
  restBehavior,
}: CustomDayScreenProps) {
  const [rewardPicker, setRewardPicker] = useState<RewardPicker>(null);
  const [fieldPicker, setFieldPicker] = useState<CustomFieldPicker>(null);
  const selectedCondition = rewardPicker?.screen === 'choice'
    ? conditions.find((condition) => condition.id === rewardPicker.conditionId)
    : undefined;
  const rewardSummary = summarizeRewardOverrides(conditions, customValues.rewardOverrides);

  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader onBack={onBack} title={dayName} />
        <View accessibilityLabel={`${dayName} rule`} accessibilityRole="radiogroup" style={s.cardGap}>
          {weeklyDayChoices.map((choice) => (
            <ChoiceRow key={choice.id} label={choice.label} onPress={() => onSelectMode(choice.id)} selected={mode === choice.id} subtitle={choice.subtitle} />
          ))}
        </View>
        {mode === 'rest' ? (
          <View accessibilityLabel="Rest day behavior" accessibilityRole="radiogroup" style={s.cardGap}>
            <SectionLabel>REST DAY ACCESS</SectionLabel>
            {restDayChoices.map((choice) => (
              <ChoiceRow key={choice.id} label={choice.label} onPress={() => onSelectRestBehavior(choice.id)} selected={restBehavior === choice.id} subtitle={choice.subtitle} />
            ))}
          </View>
        ) : null}
        {mode === 'custom' ? (
          <>
            <SectionLabel>CUSTOM FOR {dayName.toUpperCase()}</SectionLabel>
            <PillowCard padding="none" variant="grouped">
              {customDayCopy.rows.map((row, index) => (
                <View key={row.id}>
                  {index > 0 ? <DottedSeparator /> : null}
                  <SettingsRow
                    onPress={() => {
                      if (row.id === 'rewards') setRewardPicker({ screen: 'conditions' });
                      else if (row.id === 'allowance') {
                        setFieldPicker({ screen: 'allowance', draft: customValues.allowance });
                      } else {
                        const [from = '8:00 PM', to = '7:00 AM'] = customValues.window === 'All day'
                          ? []
                          : customValues.window.split('–');
                        setFieldPicker({
                          screen: 'window',
                          mode: customValues.window === 'All day' ? 'all-day' : 'window',
                          from,
                          to,
                        });
                      }
                    }}
                    title={row.label}
                    value={row.id === 'rewards' ? rewardSummary : customValues[row.id as 'allowance' | 'window']}
                  />
                </View>
              ))}
            </PillowCard>
            <Text style={s.note}>{customDayCopy.helper}</Text>
          </>
        ) : null}
        <PillButton fullWidth label="Done" onPress={onDone} variant="screen" />
        <PillButton fullWidth label="Cancel" onPress={onBack} variant="text" />
      </ScrollView>
      <ManageSheet
        doneDisabled={rewardPicker?.screen === 'choice' && !selectedCondition}
        doneLabel={rewardPicker?.screen === 'choice' ? 'Apply override' : 'Done'}
        onCancel={() => {
          if (rewardPicker?.screen === 'choice') setRewardPicker({ screen: 'conditions' });
          else setRewardPicker(null);
        }}
        onDone={() => {
          if (rewardPicker?.screen === 'choice' && selectedCondition) {
            onSetRewardOverride(selectedCondition.id, rewardPicker.draft);
            setRewardPicker({ screen: 'conditions' });
          } else {
            setRewardPicker(null);
          }
        }}
        title={selectedCondition?.name ?? 'Condition rewards'}
        visible={rewardPicker !== null}
      >
        {rewardPicker?.screen === 'conditions' ? (
          <>
            <Text style={s.note}>Choose a condition to override only for this weekday. Untouched conditions keep their usual rewards.</Text>
            {conditions.length === 0 ? (
              <PillowCard><Text style={s.body}>Add a condition first. There are no reward overrides to configure yet.</Text></PillowCard>
            ) : (
              <PillowCard padding="none" variant="grouped">
                {conditions.map((condition, index) => {
                  const override = customValues.rewardOverrides[condition.id];
                  return (
                    <View key={condition.id}>
                      {index > 0 ? <DottedSeparator /> : null}
                      <SettingsRow
                        onPress={() => setRewardPicker({
                          screen: 'choice',
                          conditionId: condition.id,
                          draft: override ? { ...override } : null,
                        })}
                        subtitle={`${condition.kind.charAt(0).toUpperCase()}${condition.kind.slice(1)} condition`}
                        title={condition.name}
                        value={formatRewardOverride(condition, override)}
                      />
                    </View>
                  );
                })}
              </PillowCard>
            )}
          </>
        ) : null}
        {rewardPicker?.screen === 'choice' && selectedCondition ? (
          <>
            <Text style={s.note}>Pick the reward behavior for {dayName}. Cancel returns without changing this condition.</Text>
            <View accessibilityLabel={`${selectedCondition.name} reward override`} accessibilityRole="radiogroup" style={s.cardGap}>
              {rewardChoicesFor(selectedCondition).map((choice) => (
                <ChoiceRow
                  key={choice.key}
                  label={choice.label}
                  onPress={() => setRewardPicker({ ...rewardPicker, draft: choice.value ? { ...choice.value } : null })}
                  selected={rewardOverrideKey(rewardPicker.draft) === choice.key}
                  subtitle={choice.subtitle}
                />
              ))}
            </View>
          </>
        ) : null}
      </ManageSheet>
      <ManageSheet
        doneLabel={fieldPicker?.screen === 'window-time' ? 'Use time' : 'Done'}
        onCancel={() => {
          if (fieldPicker?.screen === 'window-time') {
            setFieldPicker({ screen: 'window', mode: 'window', from: fieldPicker.from, to: fieldPicker.to });
          } else {
            setFieldPicker(null);
          }
        }}
        onDone={() => {
          if (fieldPicker?.screen === 'allowance') {
            onSetCustomField('allowance', fieldPicker.draft);
            setFieldPicker(null);
          } else if (fieldPicker?.screen === 'window') {
            onSetCustomField(
              'window',
              fieldPicker.mode === 'all-day' ? 'All day' : `${fieldPicker.from}–${fieldPicker.to}`,
            );
            setFieldPicker(null);
          } else if (fieldPicker?.screen === 'window-time') {
            setFieldPicker({ screen: 'window', mode: 'window', from: fieldPicker.from, to: fieldPicker.to });
          }
        }}
        title={fieldPicker?.screen === 'allowance'
          ? 'Daily free time'
          : fieldPicker?.screen === 'window-time'
            ? `Choose ${fieldPicker.edge} time`
            : 'Custom lock window'}
        visible={fieldPicker !== null}
      >
        {fieldPicker?.screen === 'allowance' ? (
          <View accessibilityLabel="Custom-day daily free time" accessibilityRole="radiogroup" style={s.cardGap}>
            {allowanceOptions.map((value) => (
              <ChoiceRow
                key={value}
                label={value}
                onPress={() => setFieldPicker({ screen: 'allowance', draft: value })}
                selected={fieldPicker.draft === value}
              />
            ))}
          </View>
        ) : null}
        {fieldPicker?.screen === 'window' ? (
          <View style={s.cardGap}>
            <View accessibilityLabel="Custom-day lock window mode" accessibilityRole="radiogroup" style={s.cardGap}>
              <ChoiceRow
                label="All day"
                onPress={() => setFieldPicker({ ...fieldPicker, mode: 'all-day' })}
                selected={fieldPicker.mode === 'all-day'}
                subtitle="Apply locking rules throughout this weekday."
              />
              <ChoiceRow
                label="Choose start and end"
                onPress={() => setFieldPicker({ ...fieldPicker, mode: 'window' })}
                selected={fieldPicker.mode === 'window'}
                subtitle="Outside this window there is no locking or balance drain."
              />
            </View>
            {fieldPicker.mode === 'window' ? (
              <PillowCard padding="none" variant="grouped">
                <SettingsRow
                  onPress={() => setFieldPicker({ screen: 'window-time', edge: 'from', from: fieldPicker.from, to: fieldPicker.to })}
                  title="From"
                  value={fieldPicker.from}
                />
                <DottedSeparator />
                <SettingsRow
                  onPress={() => setFieldPicker({ screen: 'window-time', edge: 'to', from: fieldPicker.from, to: fieldPicker.to })}
                  title="To"
                  value={fieldPicker.to}
                />
              </PillowCard>
            ) : null}
          </View>
        ) : null}
        {fieldPicker?.screen === 'window-time' ? (
          <View style={s.cardGap}>
            <MinuteTimeAdjuster
              onChange={(value) => setFieldPicker({ ...fieldPicker, [fieldPicker.edge]: value })}
              value={fieldPicker[fieldPicker.edge]}
            />
            <View accessibilityLabel={`${fieldPicker.edge} time`} accessibilityRole="radiogroup" style={s.cardGap}>
              {timeOptions.map((value) => (
                <ChoiceRow
                  key={value}
                  label={value}
                  onPress={() => setFieldPicker({
                    ...fieldPicker,
                    [fieldPicker.edge]: value,
                  })}
                  selected={fieldPicker[fieldPicker.edge] === value}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ManageSheet>
    </GradientScreen>
  );
}

function rewardChoicesFor(condition: DemoCondition): Array<{
  key: string;
  label: string;
  subtitle: string;
  value: WeeklyConditionRewardOverride | null;
}> {
  const common = [
    { key: 'usual', label: 'Use usual reward', subtitle: 'Keep this condition’s normal rule.', value: null },
    { key: 'off', label: 'Off this weekday', subtitle: 'This condition will not earn or open access.', value: { kind: 'off' } as const },
  ];
  if (condition.kind === 'state') return common;
  if (condition.kind === 'rate') {
    return [
      ...common,
      ...Array.from({ length: 12 }, (_, index) => (index + 1) * 5).map((minutes) => ({
        key: `fixed-${minutes}`,
        label: `${minutes} min per signal`,
        subtitle: 'Replace the normal rate only on this weekday.',
        value: { kind: 'fixed' as const, minutes },
      })),
    ];
  }
  return [
    ...common,
    ...Array.from({ length: 24 }, (_, index) => (index + 1) * 5).map((minutes) => ({
      key: `fixed-${minutes}`,
      label: `Add ${minutes} minutes`,
      subtitle: 'Use a fixed completion reward on this weekday.',
      value: { kind: 'fixed' as const, minutes },
    })),
    { key: 'rest-of-day', label: 'Open for the rest of the day', subtitle: 'One completion holds the balance until midnight.', value: { kind: 'rest-of-day' } },
    ...Array.from({ length: 16 }, (_, index) => (index + 1) * 15).map((minutes) => ({
      key: `set-period-${minutes}`,
      label: `Open for ${minutes} minutes`,
      subtitle: 'Use a bounded access period on this weekday.',
      value: { kind: 'set-period' as const, minutes },
    })),
  ];
}

function rewardOverrideKey(override: WeeklyConditionRewardOverride | null | undefined) {
  if (!override) return 'usual';
  if (override.kind === 'fixed') return `fixed-${override.minutes}`;
  if (override.kind === 'set-period') return `set-period-${override.minutes}`;
  return override.kind;
}

function formatRewardOverride(condition: DemoCondition, override: WeeklyConditionRewardOverride | undefined) {
  if (!override) return 'Usual reward';
  if (override.kind === 'off') return 'Off';
  if (override.kind === 'fixed') return condition.kind === 'rate' ? `${override.minutes} min / signal` : `+${override.minutes} min`;
  if (override.kind === 'rest-of-day') return 'Rest of day';
  return `${override.minutes} min open`;
}

function summarizeRewardOverrides(
  conditions: readonly DemoCondition[],
  rewardOverrides: Record<string, WeeklyConditionRewardOverride>,
) {
  const configured = conditions.filter((condition) => rewardOverrides[condition.id]);
  if (configured.length === 0) return 'Usual rewards';
  if (configured.length === 1) {
    const condition = configured[0];
    return `${condition.name}: ${formatRewardOverride(condition, rewardOverrides[condition.id])}`;
  }
  return `${configured.length} condition overrides`;
}

const styles = StyleSheet.create({
  adjustedTime: { ...type.cardTitle, color: colors.text.primary, marginTop: space[1] },
  calendarDay: { alignItems: 'center', borderRadius: radius.sm, height: 42, justifyContent: 'center', width: '100%' },
  calendarDayHost: { width: '14.2857%' },
  calendarDayLabel: { ...type.callout, color: colors.text.primary },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  customCell: { backgroundColor: colors.brand.energyAction },
  dayCell: { alignItems: 'center' as const, backgroundColor: colors.brand.primary, borderRadius: radius.card, gap: space[1], justifyContent: 'center' as const, minHeight: 72, paddingVertical: space[2] },
  dayHost: { flex: 1 },
  dayLetter: { ...type.cardTitle, color: colors.text.primary },
  dayMode: { ...type.micro, color: colors.text.primary },
  duplicateNote: { ...type.caption, color: colors.text.primary },
  monthTitle: { ...type.cardTitle, color: colors.text.primary, marginVertical: space[4], textAlign: 'center' },
  plannedDay: { backgroundColor: colors.surface.cardElevated },
  plannedDot: { backgroundColor: colors.brand.signatureAmber, borderRadius: radius.pill, height: 4, marginTop: space.optical, width: 4 },
  restCell: { backgroundColor: colors.surface.cardElevated },
  selectedDay: { backgroundColor: colors.surface.light },
  selectedDayLabel: { color: colors.text.onLight },
  weekdayLabel: { ...type.micro, color: colors.text.secondary, textAlign: 'center', width: '14.2857%' },
  weekGrid: { flexDirection: 'row' as const, gap: space[1] },
});
