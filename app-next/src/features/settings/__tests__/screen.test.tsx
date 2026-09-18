import { render, screen, userEvent, fireEvent, act } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { SettingsScreen } from '../SettingsScreen';
import { UnitsScreen } from '../UnitsScreen';
import { PreferencesScreen } from '../PreferencesScreen';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { settingsStore } from '../../../state/settingsStore';
import { rulesStore } from '../../../state/rulesStore';
import { permissionsStore } from '../../../state/permissionsStore';
import { profileStore } from '../../../state/profileStore';
import { settingsCopy as c } from '../../../content/settings';
import { supportEmail } from '../../../content/support';
import { incidentCopy as i } from '../../../content/incident';
import { validateRule } from '../../../domain/validateRule';

test('root rows navigate to destinations and seven taps open developer', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const dev = jest.fn(),
    navigate = jest.fn();
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <SettingsScreen navigate={navigate} onDev={dev} />
    </AppRuntimeProvider>,
  );
  expect(screen.queryByRole('header', { name: 'Preferences' })).toBeNull();
  expect(screen.queryByRole('header', { name: 'Account & support' })).toBeNull();
  const profile = profileStore.getState().data.name || c.account;
  expect(screen.getAllByRole('button').map((node) => node.props.accessibilityLabel)).toEqual([
    profile,
    c.manage,
    c.preferences,
    i.row,
    c.giveFeedback,
    c.supportRow,
    c.legal,
    c.version('1.0.0', '1'),
  ]);
  expect(screen.queryByRole('button', { name: c.unitsRow })).toBeNull();
  expect(screen.queryByRole('button', { name: c.exportData })).toBeNull();
  expect(screen.queryByRole('button', { name: c.permissionNames.screenTime })).toBeNull();
  expect(screen.getByRole('switch', { name: c.notificationsToggle })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: c.manage }));
  expect(navigate).toHaveBeenCalledWith('subscription');
  await userEvent.press(screen.getByRole('button', { name: c.preferences }));
  expect(navigate).toHaveBeenCalledWith('preferences');
  await userEvent.press(screen.getByRole('button', { name: i.row }));
  expect(navigate).toHaveBeenCalledWith('report');
  await userEvent.press(screen.getByRole('button', { name: c.giveFeedback }));
  expect(navigate).toHaveBeenCalledWith('feedback');
  await userEvent.press(screen.getByRole('button', { name: c.legal }));
  expect(navigate).toHaveBeenCalledWith('legal');
  await userEvent.press(screen.getByRole('button', { name: c.supportRow }));
  expect(openURL).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^mailto:${supportEmail}\\?`)));
  openURL.mockRejectedValueOnce(new Error('no mail'));
  await userEvent.press(screen.getByRole('button', { name: c.supportRow }));
  expect(await screen.findByRole('alert')).toHaveTextContent(new RegExp(supportEmail));
  await userEvent.press(screen.getByRole('button', { name: profile }));
  expect(navigate).toHaveBeenCalledWith('account');
  const footer = screen.getByRole('button', { name: /ExcerLock 1.0.0/ });
  for (let i = 0; i < 7; i++) await userEvent.press(footer);
  expect(dev).toHaveBeenCalledTimes(1);
  openURL.mockRestore();
});

test('Notifications is a single switch backed by the app preference and the OS grant', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <SettingsScreen navigate={jest.fn()} onDev={jest.fn()} />
    </AppRuntimeProvider>,
  );
  expect(permissionsStore.getState().data.notifications).toBe('granted');
  const toggle = screen.getByRole('switch', { name: c.notificationsToggle });
  expect(toggle.props.value).toBe(true);
  await act(async () => fireEvent(toggle, 'valueChange', false));
  expect(settingsStore.getState().data.notificationsEnabled).toBe(false);
  await act(async () => fireEvent(toggle, 'valueChange', true));
  expect(settingsStore.getState().data.notificationsEnabled).toBe(true);
});

test('UnitsScreen writes kilometers', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  settingsStore.getState().patch({ units: 'mi' });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <UnitsScreen onBack={() => {}} />
    </AppRuntimeProvider>,
  );
  await userEvent.press(screen.getByRole('radio', { name: 'Kilometers' }));
  expect(settingsStore.getState().data.units).toBe('km');
});

test('UnitsScreen switches units without touching step and minute goals', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  settingsStore.getState().patch({ units: 'mi' });
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <UnitsScreen onBack={() => {}} />
    </AppRuntimeProvider>,
  );
  await userEvent.press(screen.getByRole('radio', { name: 'Kilometers' }));
  expect(settingsStore.getState().data.units).toBe('km');
  expect(screen.queryByRole('alert')).toBeNull();
  for (const r of rulesStore.getState().data.rules) {
    expect(['walking', 'gym']).toContain(r.activity);
    expect(validateRule(r)).toEqual([]);
  }
});

test('PreferencesScreen lists permissions, walking places, grace and gyms', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const navigate = jest.fn();
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <PreferencesScreen navigate={navigate} onBack={() => {}} />
    </AppRuntimeProvider>,
  );
  expect(screen.getByRole('header', { name: c.preferences })).toBeTruthy();
  expect(screen.queryAllByRole('button', { name: /, (Granted|Needed|Off)$/ })).toHaveLength(0);
  await userEvent.press(screen.getByRole('button', { name: /Walk & Scroll stop grace/ }));
  await userEvent.press(screen.getByRole('radio', { name: '2 minutes' }));
  expect(settingsStore.getState().data.stopGrace).toBe(120);
  expect(screen.queryByRole('switch', { name: 'Touch feedback' })).toBeNull();
  expect(screen.getByRole('checkbox', { name: c.walkOutside })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Saved gyms' }));
  expect(navigate).toHaveBeenCalledWith('gyms');
});
