import { Text } from 'react-native';
import { renderRouter, screen } from 'expo-router/testing-library';
import { userEvent, fireEvent, act } from '@testing-library/react-native';
import { createRuntime } from '../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../runtime/AppRuntimeProvider';
import { RootNavigator } from '../../features/launch/RootNavigator';
import Tabs from '../../../app/(tabs)/_layout';
import Conditions from '../../../app/(tabs)/conditions';
import { HomeScreen } from '../../features/home/HomeScreen';
import { rulesStore } from '../../state/rulesStore';
import { ruleName } from '../../domain/ruleName';
import { deleteRule } from '../../features/conditions/mutations';
import { ruleDaysStore } from '../../state/ruleDaysStore';
test('overlapping conditions pause across tabs and deletion removes their progress', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const r = renderRouter(
    {
      _layout: () => (
        <AppRuntimeProvider runtime={runtime}>
          <RootNavigator />
        </AppRuntimeProvider>
      ),
      '(tabs)/_layout': Tabs,
      '(tabs)/home': HomeScreen,
      '(tabs)/conditions': Conditions,
      '(tabs)/analytics': () => <Text>Analytics</Text>,
      '(tabs)/settings': () => <Text>Settings</Text>,
      builder: () => <Text>Builder</Text>,
    },
    { initialUrl: '/conditions' },
  );
  const rendered = await r;
  const rules = rulesStore.getState().data.rules;
  expect(rules).toHaveLength(3);
  for (const rule of rules) await fireEvent(screen.getByRole('switch', { name: ruleName(rule) }), 'valueChange', false);
  await userEvent.press(screen.getByRole('tab', { name: 'Home' }));
  expect(screen.getByRole('header', { name: 'All conditions are paused' })).toBeTruthy();
  expect(screen.queryByText('Today’s conditions')).toBeNull();
  await act(() => deleteRule(rules[0].id));
  expect(rulesStore.getState().data.rules).toHaveLength(2);
  expect(ruleDaysStore.getState().data.days.some((d) => d.ruleId === rules[0].id)).toBe(false);
  await rendered.unmount();
});
