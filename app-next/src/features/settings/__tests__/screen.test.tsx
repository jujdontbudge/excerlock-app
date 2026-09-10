import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';
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
    c.reportBug,
    c.giveFeedback,
    c.supportRow,
    c.legal,
    expect.stringMatching(/ExcerLock /),
  ]);
  expect(screen.queryByRole('button', { name: /Units/ })).toBeNull();
  expect(screen.queryByRole('button', { name: c.privacyPermissions })).toBeNull();
  expect(screen.getByRole('switch', { name: c.permissionNames.notifications })).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: c.manage }));
  expect(navigate).toHaveBeenCalledWith('subscription');
  expect(navigate).not.toHaveBeenCalledWith('permission/notifications');
  expect(navigate).not.toHaveBeenCalledWith('units');
  expect(navigate).not.toHaveBeenCalledWith('preferences');
  await userEvent.press(screen.getByRole('button', { name: c.reportBug }));
  expect(navigate).toHaveBeenCalledWith('bug');
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

test('Notifications toggle writes the permission', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <SettingsScreen navigate={jest.fn()} onDev={jest.fn()} />
    </AppRuntimeProvider>,
  );
  expect(permissionsStore.getState().data.notifications).toBe('granted');
  await fireEvent(screen.getByRole('switch', { name: c.permissionNames.notifications }), 'valueChange', false);
  expect(permissionsStore.getState().data.notifications).toBe('denied');
  await fireEvent(screen.getByRole('switch', { name: c.permissionNames.notifications }), 'valueChange', true);
  expect(permissionsStore.getState().data.notifications).toBe('granted');
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

test('PreferencesScreen lists permissions, grace, haptics and gyms', async () => {
  const runtime = createRuntime();
  await runtime.dev.load('multi-rule-overlap');
  const navigate = jest.fn();
  await render(
    <AppRuntimeProvider runtime={runtime}>
      <PreferencesScreen navigate={navigate} onBack={() => {}} />
    </AppRuntimeProvider>,
  );
  expect(screen.getByRole('header', { name: c.privacyPermissions })).toBeTruthy();
  expect(screen.getAllByRole('button', { name: /, (Granted|Needed|Off)$/ })).toHaveLength(5);
  expect(screen.queryByRole('button', { name: /Health/ })).toBeNull();
  await userEvent.press(screen.getByRole('button', { name: /Walk & Scroll stop grace/ }));
  await userEvent.press(screen.getByRole('radio', { name: '2 minutes' }));
  expect(settingsStore.getState().data.stopGrace).toBe(120);
  const haptics = settingsStore.getState().data.haptics;
  await fireEvent(screen.getByRole('switch', { name: 'Touch feedback' }), 'valueChange', !haptics);
  expect(settingsStore.getState().data.haptics).toBe(!haptics);
  await userEvent.press(screen.getByRole('button', { name: 'Saved gyms' }));
  expect(navigate).toHaveBeenCalledWith('gyms');
});
