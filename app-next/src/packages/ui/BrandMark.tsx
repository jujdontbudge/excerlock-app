import { Image, StyleSheet, View } from 'react-native';
import { Label } from './Label';
import { tokens as t } from './tokens';

export function BrandMark({ name }: { name: string }) {
  return (
    <View style={s.row}>
      <Image
        source={require('../../../assets/running-lock-primary.png')}
        resizeMode="contain"
        accessible={false}
        style={s.logo}
      />
      <Label variant="brand">{name}</Label>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.space.sm },
  logo: { width: t.icon.lg, height: t.icon.lg },
});
