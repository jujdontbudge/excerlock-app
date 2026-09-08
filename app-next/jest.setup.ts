jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
import 'react-native-gesture-handler/jestSetup';
jest.mock('react-native-reanimated/mock', () => ({
  ...jest.requireActual('react-native-reanimated/mock'),
  useReducedMotion: () => true,
}));
jest.mock('react-native-reanimated', () => ({
  ...require('react-native-reanimated/mock'),
  useReducedMotion: () => true,
}));
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { __esModule: true, Circle: View, Marker: View, default: React.forwardRef((props: object, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
    return React.createElement(View, props);
  }) };
});
// Sign in with Apple has no simulator or test-renderer implementation. `isAvailableAsync` resolving
// false is what a simulator reports, so screens fall back to the app's own button in every test that
// does not deliberately turn it on.
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => false),
  signInAsync: jest.fn(),
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonType: { SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { BLACK: 2 },
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
import { setLocaleForTests } from './src/content/locale';
// Copy expectations assume one device: en-US numbers, a 12-hour clock and a Monday-start week.
// Locale tests override per case and restore this fixture afterwards.
setLocaleForTests({ tag: 'en-US', hour12: true, weekStart: 1 });

// The two vendor SDKs never run under test: the adapters are exercised through their own ports,
// and a real PostHog or Sentry client would open native modules and a network queue.
jest.mock('posthog-react-native', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    capture: jest.fn(),
    screen: jest.fn(),
    identify: jest.fn(),
    setPersonProperties: jest.fn(),
    optIn: jest.fn(),
    optOut: jest.fn(),
    reset: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  wrap: (component: unknown) => component,
}));
