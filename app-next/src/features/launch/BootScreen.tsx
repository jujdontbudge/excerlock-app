import { common } from '../../content/common';
import { Image, StyleSheet, View } from 'react-native';
import { tokens } from '../../design-system/tokens';
export function BootScreen() {
  return <View testID="boot" style={styles.page}><Image accessible accessibilityRole="image" source={require('../../../assets/running-lock.png')} accessibilityLabel={common.appName} style={styles.logo} /></View>;
}
const styles = StyleSheet.create({ page: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.surface.canvas }, logo: { width: tokens.layout.logo, height: tokens.layout.logo } });
