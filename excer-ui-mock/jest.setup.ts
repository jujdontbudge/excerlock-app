import 'react-native-gesture-handler/jestSetup';

jest.mock('expo-image', () => {
  const ReactNative = jest.requireActual('react-native');

  return {
    __esModule: true,
    Image: ReactNative.Image,
    ImageBackground: ReactNative.ImageBackground,
    useImage: () => null,
  };
});

jest.mock('react-native-reanimated/mock', () => {
  const ReactNative = jest.requireActual('react-native');

  return {
    __esModule: true,
    default: {
      Image: ReactNative.Image,
      ScrollView: ReactNative.ScrollView,
      Text: ReactNative.Text,
      View: ReactNative.View,
      call: () => undefined,
    },
    cubicBezier: (x1: number, y1: number, x2: number, y2: number) =>
      `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`,
    useReducedMotion: () => true,
  };
});

jest.mock('react-native-reanimated', () => jest.requireMock('react-native-reanimated/mock'));
