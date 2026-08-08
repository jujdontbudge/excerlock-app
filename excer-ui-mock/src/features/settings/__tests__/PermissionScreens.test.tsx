import type { ReactElement } from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PermissionsScreen } from '../PermissionScreens';

const safeAreaMetrics = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const renderScreen = (screen: ReactElement) => render(
  <SafeAreaProvider initialMetrics={safeAreaMetrics}>{screen}</SafeAreaProvider>,
);

describe('permission status truth', () => {
  it('renders each persisted outcome independently and opens the exact row', async () => {
    const onOpenPermission = jest.fn();
    const view = await renderScreen(
      <PermissionsScreen
        onBack={jest.fn()}
        onOpenAbout={jest.fn()}
        onOpenPermission={onOpenPermission}
        statuses={{
          screenTime: 'healthy',
          location: 'notAsked',
          motion: 'attention',
          health: 'healthy',
          notifications: 'notAsked',
        }}
      />,
    );

    expect(view.getAllByText('Allowed in demo')).toHaveLength(2);
    expect(view.getByText('Needs attention')).toBeTruthy();
    expect(view.getAllByText('Not asked · optional')).toHaveLength(2);

    await fireEvent.press(view.getByRole('button', { name: /Motion & Fitness/ }));
    expect(onOpenPermission).toHaveBeenCalledWith('motion');
  });
});
