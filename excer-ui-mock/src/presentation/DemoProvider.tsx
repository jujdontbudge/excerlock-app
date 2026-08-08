import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type PropsWithChildren,
} from 'react';

import { createDemoState, type CreateDemoStateOptions } from './fixtures';
import { transitionDemo } from './transition';
import type { DemoAction, DemoState } from './types';

type DemoContextValue = {
  state: DemoState;
  dispatch: Dispatch<DemoAction>;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export type DemoProviderProps = PropsWithChildren<{
  initialOptions?: CreateDemoStateOptions;
  initialState?: DemoState;
}>;

export function DemoProvider({ children, initialOptions, initialState }: DemoProviderProps) {
  const [state, dispatch] = useReducer(
    transitionDemo,
    initialState ?? createDemoState(initialOptions),
  );
  useEffect(() => {
    if (state.review.shieldSuppressionRemainingMinutes <= 0) return;
    const timer = setTimeout(() => dispatch({ type: 'review/advance-clock', minutes: 1 }), 60_000);
    return () => clearTimeout(timer);
  }, [state.review.shieldSuppressionRemainingMinutes]);
  const eventCooldownIsRunning = state.conditions.some(
    (condition) => condition.kind === 'event'
      && condition.repeatable
      && condition.cooldownRemainingMinutes > 0,
  );
  useEffect(() => {
    if (!eventCooldownIsRunning) return;
    const timer = setTimeout(() => dispatch({ type: 'condition/advance-clock', minutes: 1 }), 60_000);
    return () => clearTimeout(timer);
  }, [eventCooldownIsRunning, state.conditions]);
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be rendered inside DemoProvider.');
  }
  return context;
}
