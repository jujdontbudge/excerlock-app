import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import {
  CustomDayScreen,
  TodayOverrideScreen,
  WeeklyRulesScreen,
  type DayMode,
  type WeekdayId,
} from '@/features/manage';
import {
  useDemo,
  type WeeklyRuleConfig,
} from '@/presentation';

const weekdays: readonly WeekdayId[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];

type DayDraft = {
  day: WeekdayId;
  mode: DayMode;
  restBehavior: 'no-locking' | 'allowance-only';
  customValues: WeeklyRuleConfig['customValues'][WeekdayId];
};

function cloneWeekly(weekly: WeeklyRuleConfig): WeeklyRuleConfig {
  return {
    ...weekly,
    dayModes: { ...weekly.dayModes },
    restBehaviors: { ...weekly.restBehaviors },
    customValues: Object.fromEntries(
      Object.entries(weekly.customValues).map(([day, values]) => [day, {
        ...values,
        rewardOverrides: Object.fromEntries(
          Object.entries(values.rewardOverrides).map(([conditionId, override]) => [conditionId, { ...override }]),
        ),
      }]),
    ) as WeeklyRuleConfig['customValues'],
    plannedDaysOff: weekly.plannedDaysOff.map((day) => ({ ...day })),
  };
}

export default function WeeklyRulesRoute() {
  const { day, mode: routeMode } = useLocalSearchParams<{ day?: string; mode?: string }>();
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const initialWeekly = state.rules.weekly;
  const [weekly, setWeekly] = useState(() => cloneWeekly(initialWeekly));
  const initialDay = weekdays.includes(day as WeekdayId) ? day as WeekdayId : null;
  const [panel, setPanel] = useState<'root' | 'today' | 'day'>(
    routeMode === 'today' ? 'today' : initialDay ? 'day' : 'root',
  );
  const [reason, setReason] = useState('');
  const [dayDraft, setDayDraft] = useState<DayDraft | null>(() => initialDay ? {
    day: initialDay,
    mode: weekly.dayModes[initialDay],
    restBehavior: weekly.restBehaviors[initialDay],
    customValues: {
      ...weekly.customValues[initialDay],
      rewardOverrides: { ...weekly.customValues[initialDay].rewardOverrides },
    },
  } : null);

  const dirty = JSON.stringify(weekly) !== JSON.stringify(initialWeekly);

  const cancelRoot = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Discard weekly rule changes?', 'Your saved schedule and planned days off will stay the same.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const openDay = (weekday: WeekdayId) => {
    setDayDraft({
      day: weekday,
      mode: weekly.dayModes[weekday],
      restBehavior: weekly.restBehaviors[weekday],
      customValues: {
        ...weekly.customValues[weekday],
        rewardOverrides: { ...weekly.customValues[weekday].rewardOverrides },
      },
    });
    setPanel('day');
  };

  if (panel === 'today') {
    return (
      <TodayOverrideScreen
        onBack={() => routeMode === 'today' ? router.back() : setPanel('root')}
        onConfirmPreview={() => Alert.alert(
          'Use a rest day today?',
          'Today will not extend or break the streak. The reason stays in this local demo.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Confirm rest day',
              onPress: () => {
                dispatch({ type: 'rules/use-rest-day-today', reason });
                router.replace('/manage' as Href);
              },
            },
          ],
        )}
        onReasonChange={setReason}
        reason={reason}
      />
    );
  }

  if (panel === 'day' && dayDraft) {
    return (
      <CustomDayScreen
        conditions={state.conditions}
        customValues={dayDraft.customValues}
        dayName={dayDraft.day.charAt(0).toUpperCase() + dayDraft.day.slice(1)}
        mode={dayDraft.mode}
        onBack={() => {
          setDayDraft(null);
          setPanel('root');
        }}
        onDone={() => {
          setWeekly((current) => ({
            ...current,
            dayModes: { ...current.dayModes, [dayDraft.day]: dayDraft.mode },
            restBehaviors: { ...current.restBehaviors, [dayDraft.day]: dayDraft.restBehavior },
            customValues: {
              ...current.customValues,
              [dayDraft.day]: {
                ...dayDraft.customValues,
                rewardOverrides: { ...dayDraft.customValues.rewardOverrides },
              },
            },
          }));
          setDayDraft(null);
          setPanel('root');
        }}
        onSetCustomField={(field, value) => setDayDraft((current) => current ? {
          ...current,
          customValues: { ...current.customValues, [field]: value },
        } : current)}
        onSetRewardOverride={(conditionId, override) => setDayDraft((current) => {
          if (!current) return current;
          const rewardOverrides = { ...current.customValues.rewardOverrides };
          if (override) rewardOverrides[conditionId] = { ...override };
          else delete rewardOverrides[conditionId];
          return {
            ...current,
            customValues: { ...current.customValues, rewardOverrides },
          };
        })}
        onSelectMode={(mode) => setDayDraft((current) => current ? { ...current, mode } : current)}
        onSelectRestBehavior={(restBehavior) => setDayDraft((current) => current ? { ...current, restBehavior } : current)}
        restBehavior={dayDraft.restBehavior}
      />
    );
  }

  return (
    <WeeklyRulesScreen
      dayModes={weekly.dayModes}
      lockWindowEnabled={weekly.lockWindowEnabled}
      lockWindowFrom={weekly.lockWindowFrom}
      lockWindowTo={weekly.lockWindowTo}
      onAddDayOff={(date, label) => setWeekly((current) => ({
        ...current,
        plannedDaysOff: [...current.plannedDaysOff, { date, label }].sort((a, b) => a.date.localeCompare(b.date)),
      }))}
      onBack={cancelRoot}
      onChangeTime={(edge, value) => setWeekly((current) => ({
        ...current,
        [edge === 'from' ? 'lockWindowFrom' : 'lockWindowTo']: value,
      }))}
      onDone={() => {
        dispatch({ type: 'rules/set-weekly', weekly });
        router.back();
      }}
      onOpenDay={openDay}
      onRemoveDayOff={(date, label) => Alert.alert(
        `Remove ${label}?`,
        'That date will return to its usual weekday rule.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => setWeekly((current) => ({
              ...current,
              plannedDaysOff: current.plannedDaysOff.filter((dayOff) => dayOff.date !== date),
            })),
          },
        ],
      )}
      onToggleLockWindow={(lockWindowEnabled) => setWeekly((current) => ({ ...current, lockWindowEnabled }))}
      plannedDaysOff={weekly.plannedDaysOff}
    />
  );
}
