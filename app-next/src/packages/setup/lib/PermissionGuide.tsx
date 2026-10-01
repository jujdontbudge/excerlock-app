import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SystemAlert, type SystemAlertCopy } from '../../ui/SystemAlert';
import { Reveal } from '../../ui/Reveal';

export function PermissionGuide({ alert, onPress }: { alert: SystemAlertCopy; onPress: () => void }) {
  const insets = useSafeAreaInsets(),
    { height } = useWindowDimensions(),
    [alertHeight, setAlertHeight] = useState(0),
    top = insets.top + (height - insets.top - insets.bottom - alertHeight) / 2;
  return (
    <View
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, top, alignItems: 'center', opacity: alertHeight ? 1 : 0 }}>
      <Reveal index={1}>
        <SystemAlert alert={alert} guide onPress={onPress} onLayout={(event) => setAlertHeight(event.nativeEvent.layout.height)} />
      </Reveal>
    </View>
  );
}
