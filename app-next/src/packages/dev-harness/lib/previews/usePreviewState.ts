import { useState } from 'react';
import { ActivityId } from '../../../ui/activitiesCopy';
import { TabId } from '../../../ui/tabsCopy';
export function usePreviewState(alternate: boolean, name: string) {
  const [flag, setFlag] = useState(alternate),
    [text, setText] = useState(name === 'NumberField' ? '2' : 'Alex'),
    [number, setNumber] = useState(3),
    [unit, setUnit] = useState('km'),
    [days, setDays] = useState([1, 2, 3, 4, 5]),
    [activity, setActivity] = useState<ActivityId>('walking'),
    [period, setPeriod] = useState('Week'),
    [tab, setTab] = useState<TabId>('home'),
    [open, setOpen] = useState(alternate && (name === 'BottomSheet' || name === 'FakeSystemPrompt')),
    [which, setWhich] = useState<'start' | 'end'>('start'),
    [start, setStart] = useState(new Date(2026, 8, 6, 9)),
    [end, setEnd] = useState(new Date(2026, 8, 6, 21));
  return {
    flag,
    setFlag,
    text,
    setText,
    number,
    setNumber,
    unit,
    setUnit,
    days,
    setDays,
    activity,
    setActivity,
    period,
    setPeriod,
    tab,
    setTab,
    open,
    setOpen,
    which,
    start,
    setStart,
    end,
    setEnd,
    toggle: () => setFlag((v) => !v),
    chooseTime: (time: 'start' | 'end') => {
      setWhich(time);
      setOpen(true);
    },
  };
}
