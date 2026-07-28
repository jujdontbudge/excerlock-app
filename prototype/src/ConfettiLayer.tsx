import React, { forwardRef, useImperativeHandle } from 'react';
import { View } from 'react-native';

export type ConfettiHandle = {
  fire: () => void;
};

export const ConfettiLayer = forwardRef<ConfettiHandle>(function ConfettiLayer(_props, ref) {
  useImperativeHandle(ref, () => ({ fire: () => undefined }), []);
  return <View pointerEvents="none" />;
});
