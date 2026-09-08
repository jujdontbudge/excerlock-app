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
import { setLocaleForTests } from './src/content/locale';
// Copy expectations assume one device: en-US numbers, a 12-hour clock and a Monday-start week.
// Locale tests override per case and restore this fixture afterwards.
setLocaleForTests({ tag: 'en-US', hour12: true, weekStart: 1 });
