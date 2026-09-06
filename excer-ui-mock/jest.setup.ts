import 'react-native-gesture-handler/jestSetup';

jest.mock('@react-native-community/slider', () => {
  const React = jest.requireActual('react');
  const ReactNative = jest.requireActual('react-native');

  return React.forwardRef((props: object, ref: unknown) => (
    React.createElement(ReactNative.View, { ...props, ref })
  ));
});

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
      createAnimatedComponent: (component: unknown) => component,
    },
    cubicBezier: (x1: number, y1: number, x2: number, y2: number) =>
      `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`,
    useAnimatedStyle: (factory: () => object) => factory(),
    useReducedMotion: () => true,
    useSharedValue: (value: number) => ({ value }),
    withSpring: (value: number) => value,
    withTiming: (value: number) => value,
  };
});

jest.mock('react-native-reanimated', () => jest.requireMock('react-native-reanimated/mock'));
