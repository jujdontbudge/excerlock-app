import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SystemAlert, type SystemAlertCopy } from '../../design-system/SystemAlert';
import { Reveal } from '../../motion/Reveal';

/**
 * The iOS alert this screen is about to trigger, drawn where iOS will put it (centred in the safe
 * area), so the real one lands exactly on its copy and the orange arrow beside it keeps pointing
 * at the button to tap, the way Opal and stoic guide a permission (ADR 0043). A picture: VoiceOver
 * reads the line under the title instead.
 */
export function PermissionGuide({ alert }: { alert: SystemAlertCopy }) {
  const insets = useSafeAreaInsets(),
    { height } = useWindowDimensions(),
    [alertHeight, setAlertHeight] = useState(0),
    top = insets.top + (height - insets.top - insets.bottom - alertHeight) / 2;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', left: 0, right: 0, top, alignItems: 'center', opacity: alertHeight ? 1 : 0 }}>
      <Reveal index={1}>
        <SystemAlert alert={alert} guide onLayout={(event) => setAlertHeight(event.nativeEvent.layout.height)} />
      </Reveal>
    </View>
  );
}
