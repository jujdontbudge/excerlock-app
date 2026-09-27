import { View } from 'react-native';
import { TextField } from '../../../ui';
import { tokens as t } from '../../../ui/tokens';
import { onboardingLabels as c } from '../onboardingCopy';
export function NameField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <View style={{ gap: t.space.sm }}>
      <TextField
        hideLabel
        label={c.name}
        placeholder={c.name}
        autoComplete="given-name"
        textContentType="givenName"
        value={value}
        onChangeText={onChange}
        maxLength={30}
      />
    </View>
  );
}
