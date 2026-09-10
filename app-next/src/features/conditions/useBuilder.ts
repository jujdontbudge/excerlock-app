import { useState } from 'react';
import { useStore } from 'zustand';
import { Keyboard } from 'react-native';
import { Activity } from '../../domain/types';
import { rulesStore } from '../../state/rulesStore';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { createDraft, fromRule, toRule } from '../rules/draft';
import { createRuleDraftStore } from '../rules/RuleDraftStore';
import { scheduleDraft, reduceSchedule, toSchedule, ScheduleAction } from '../rules/scheduleDraft';
import { builderPath, builderValid } from './builderFlow';
import { saveRule } from './mutations';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
export function useBuilder(id: string | undefined, onClose: () => void) {
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
    dispatch,
    valid: step === 'GPlace' ? gymCount > 0 : builderValid(step, draft, schedule, chosen),
    choose: (activity: Activity) => {
      store.getState().replace(createDraft(activity, runtime.clock.now()));
      setChosen(true);
    },
    onSchedule: (a: ScheduleAction) => setSchedule((s) => reduceSchedule(s, a)),
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
        const path = builderPath(draft);
        move(path[Math.max(0, path.indexOf(step) - 1)], true);
      }
    },
    next: () => {
      if (step === 'S3') {
        saveRule(toRule({ ...draft, updatedAt: runtime.clock.now() }, toSchedule(schedule)));
        onClose();
      } else if (backup) {
        setBackup(null);
        move('S3');
      } else {
        const path = builderPath(draft);
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
