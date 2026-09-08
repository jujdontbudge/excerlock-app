declare const __DEV__: boolean;

export const devMenuEnabled = __DEV__ || process.env.EXPO_PUBLIC_DEV_MENU === '1';
