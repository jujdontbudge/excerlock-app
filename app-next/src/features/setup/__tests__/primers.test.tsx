import { render, screen, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { PermissionPrimer } from '../PermissionPrimer';
import { createRuntime } from '../../../runtime/createRuntime';
import { AppRuntimeProvider } from '../../../runtime/AppRuntimeProvider';
import { permissionsStore } from '../../../state/permissionsStore';
import { settingsCopy } from '../../../content/settings';
test.each(['screenTime', 'motion', 'health', 'location'] as const)(
  '%s denied primer explains the missing ability and allows continuation',
  async (name) => {
    const r = createRuntime();
    await r.dev.load('fresh-install');
    permissionsStore.getState().patch({ [name]: 'denied' });
    const onContinue = jest.fn();
    await render(
      <AppRuntimeProvider runtime={r}>
        <PermissionPrimer name={name} onContinue={onContinue} />
      </AppRuntimeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Continue anyway' })).toBeTruthy();
    expect(screen.getByText(settingsCopy.permissionPaths[name])).toBeTruthy();
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await userEvent.press(screen.getByRole('button', { name: 'Open Settings' }));
    expect(openSettings).toHaveBeenCalledTimes(1);
    openSettings.mockRestore();
    await userEvent.press(screen.getByRole('button', { name: 'Continue anyway' }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  },
);
