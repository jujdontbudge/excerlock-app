import { common } from '../../content/common';
import { Image, StyleSheet, View } from 'react-native';
import { tokens } from '../../design-system/tokens';
import { LinearGradient } from 'expo-linear-gradient';
export function BootScreen() {
  return (
    <View testID="boot" style={styles.page}>
      <LinearGradient colors={tokens.surface.orangeGradient} locations={[0, 0.35, 1]} style={[StyleSheet.absoluteFill, { height: '100%' }]} />
      <Image
        accessible
        accessibilityRole="image"
        source={require('../../../assets/running-lock.png')}
        accessibilityLabel={common.appName}
        style={styles.logo}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.surface.card,
  },
  logo: { width: tokens.layout.logo, height: tokens.layout.logo },
});
