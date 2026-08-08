import { render, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import HomeRoute from '@/app/(tabs)/home';
import {
  createDemoState,
  transitionDemo,
  type DemoState,
} from '@/presentation';

const mockDispatch = jest.fn();
let mockDemoState: DemoState;

jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  impactAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useNavigation: () => ({
    addListener: jest.fn(() => jest.fn()),
    isFocused: jest.fn(() => true),
  }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

jest.mock('@/features/home', () => {
  const React = require('react');
  const { View } = require('react-native');
  const actual = jest.requireActual('@/features/home');
  return {
    ...actual,
    HomeScreen: () => React.createElement(View, { testID: 'home-screen' }),
  };
});

jest.mock('@/presentation', () => {
  const actual = jest.requireActual('@/presentation');
  return {
    ...actual,
    useDemo: () => ({ dispatch: mockDispatch, state: mockDemoState }),
  };
});

function createUnlockTransition() {
  return transitionDemo(
    createDemoState({ stage: 'home', showcase: true }),
    { type: 'condition/complete-event', conditionId: 'demo-gym' },
  );
}

describe('Home route unlock haptic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDemoState = createUnlockTransition();
  });

  it('plays exactly once for the same qualifying unlock transition', async () => {
    const view = await render(<HomeRoute />);

    await waitFor(() => expect(Haptics.impactAsync).toHaveBeenCalledTimes(1));

    mockDemoState = {
      ...mockDemoState,
      home: {
        ...mockDemoState.home,
        earnTransition: mockDemoState.home.earnTransition
          ? { ...mockDemoState.home.earnTransition }
          : null,
      },
    };
    await view.rerender(<HomeRoute />);

    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
  });

  it('does not play when haptics are disabled', async () => {
    mockDemoState = {
      ...mockDemoState,
      settings: { ...mockDemoState.settings, haptics: false },
    };

    await render(<HomeRoute />);

    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });
});
