import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from './tokens';

export interface StatusBarMockProps {
  battery?: string;
  style?: StyleProp<ViewStyle>;
  time?: string;
}

/** Preview/debug fixture only. Native routes should use the real iOS status bar. */
export function StatusBarMock({ battery = '100%', style, time = '9:41' }: StatusBarMockProps) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.row, style]}>
      <Text style={styles.text}>{time}</Text>
      <View style={styles.indicators}>
        <Text style={styles.text}>▮▮▮</Text>
        <Text style={styles.text}>⌁</Text>
        <Text style={styles.text}>{battery}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  indicators: { alignItems: 'center', flexDirection: 'row', gap: space[2] },
  row: { alignItems: 'center', flexDirection: 'row', height: 44, justifyContent: 'space-between', paddingHorizontal: space[5] },
  text: { ...type.caption, color: colors.text.primary, fontWeight: '600' },
});
