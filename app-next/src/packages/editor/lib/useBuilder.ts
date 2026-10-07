import { useState } from 'react';
import { notify } from '../../ui/Notice';
import { conditionsCopy } from '../../conditions/conditionsCopy';
import { useStore } from 'zustand';
import { Keyboard } from 'react-native';
import { Activity, Rule } from '../../model/types';
import { rulesStore } from '../../conditions/rulesStore';
import { settingsStore as useSettingsStore } from '../../preferences/settingsStore';
import { createDraft, fromRule, toRule } from '../../conditions/draft';
import { createRuleDraftStore } from '../../conditions/RuleDraftStore';
import { scheduleDraft, reduceSchedule, toSchedule, ScheduleAction } from '../../conditions/scheduleDraft';
import { builderPath, builderValid } from './builderFlow';
import { saveRule } from './mutations';
import { useRuntime } from '../../ports/useRuntime';
import { SchedulePlanError } from '../../schedule/scheduleRepresentability';
import { ruleNeedsSetup } from '../../permissions/useSetupNeeds';
import { haptic } from '../../ui/haptics';
export function useBuilder(id: string | undefined, onClose: () => void, onNeeds?: () => void, stage?: (rule: Rule) => void) {
  const runtime = useRuntime();
  const gymCount = useSettingsStore((s) => s.data.gymPlaces.length);
  const [initial] = useState(() => {
    const rule = rulesStore.getState().data.rules.find((r) => r.id === id);
    const draft = rule
      ? fromRule(rule)
      : createDraft('walking', runtime.clock.now());
    const schedule = rule
      ? scheduleDraft({
          days: rule.schedule.days,
          allDay: rule.schedule.window.kind === 'allDay',
          ...(rule.schedule.window.kind === 'range' ? rule.schedule.window : {}),
        })
      : scheduleDraft({});
    return { draft, schedule, editing: !!rule };
  });
  const [store] = useState(() => createRuleDraftStore(initial.draft));
  const draft = useStore(store, (s) => s.draft),
    dispatch = useStore(store, (s) => s.dispatch);
  const [schedule, setSchedule] = useState(initial.schedule),
    [step, setStep] = useState(initial.editing ? 'S3' : 'O20'),
    [chosen, setChosen] = useState(initial.editing),
    [confirm, setConfirm] = useState(false),
    [backup, setBackup] = useState<{ draft: typeof draft; schedule: typeof schedule } | null>(null),
    [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const dirty =
    JSON.stringify({ draft, schedule }) !== JSON.stringify({ draft: initial.draft, schedule: initial.schedule }) ||
    (!initial.editing && chosen);
  const move = (next: string, back = false) => {
    Keyboard.dismiss();
    setDirection(back ? 'back' : 'forward');
    setStep(next);
  };
  return {
    draft,
    schedule,
    step,
    chosen,
    confirm,
    direction,
    editing: initial.editing,
    dispatch,
    valid: step === 'GPlace' ? gymCount > 0 : builderValid(step, draft, schedule, chosen),
    choose: (activity: Activity) => {
      store.getState().replace(createDraft(activity, runtime.clock.now()));
      setChosen(true);
    },
    onSchedule: (a: ScheduleAction) => {
      setSchedule((s) => reduceSchedule(s, a));
    },
    edit: (target: string) => {
      setBackup({ draft, schedule });
      move(target, true);
    },
    back: () => {
      if (backup) {
        store.getState().replace(backup.draft);
        setSchedule(backup.schedule);
        setBackup(null);
        move('S3', true);
      } else {
        const path = builderPath(draft, !!stage);
        move(path[Math.max(0, path.indexOf(step) - 1)], true);
      }
    },
    next: () => {
      if (stage && step === 'S1') {
        try {
          stage(toRule({ ...draft, updatedAt: runtime.clock.now() }, toSchedule(schedule)));
          haptic('commit');
        } catch (error) {
          if (!(error instanceof SchedulePlanError)) throw error;
          notify(conditionsCopy.scheduleLimit);
          haptic('error');
        }
      } else if (step === 'S3') {
        try {
          const rule = toRule({ ...draft, updatedAt: runtime.clock.now() }, toSchedule(schedule));
          const saved = saveRule(rule, {
            now: runtime.clock.now(),
            timezone: runtime.clock.timezone(),
          });
          runtime.analytics.track(saved === 'created' ? 'condition_created' : 'condition_edited');
          haptic('commit');
          if (onNeeds && ruleNeedsSetup(rule)) onNeeds();
          else onClose();
        } catch (error) {
          if (!(error instanceof SchedulePlanError)) throw error;
          notify(conditionsCopy.scheduleLimit);
          haptic('error');
        }
      } else if (backup) {
        setBackup(null);
        move('S3');
      } else {
        const path = builderPath(draft, !!stage);
        move(path[path.indexOf(step) + 1]);
      }
    },
    cancel: () => {
      Keyboard.dismiss();
      if (dirty) setConfirm(true);
      else onClose();
    },
    keep: () => setConfirm(false),
    discard: onClose,
  };
}
