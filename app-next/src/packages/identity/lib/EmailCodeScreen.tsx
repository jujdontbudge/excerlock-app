import { View } from 'react-native';
import { Heading, TextField, PrimaryButton, SecondaryButton, Label } from '../../ui';
import { tokens as t } from '../../ui/tokens';
import { signInCopy as c } from './signInCopy';
export function EmailCodeScreen({
  code,
  email,
  onCode,
  onVerify,
  onResend,
  onChangeEmail,
  busy,
  resendIn,
}: {
  code: string;
  email: string;
  onCode: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
  onChangeEmail: () => void;
  busy: boolean;
  resendIn: number;
}) {
  return (
    <>
      <View style={{ gap: t.space.md }}>
        <Heading title={c.codeTitle} centered />
        <Label tone="secondary" style={{ textAlign: 'center' }}>{c.codeSentTo(email)}</Label>
      </View>
      <TextField
        label={c.codeLabel}
        value={code}
        onChangeText={(value) => onCode(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus
      />
      <PrimaryButton label={c.verify} disabled={code.length !== 6} loading={busy} onPress={onVerify} />
      <View style={{ gap: t.space.xs }}>
        <SecondaryButton
          label={resendIn > 0 ? c.resendIn(resendIn) : c.resend}
          disabled={resendIn > 0}
          loading={busy}
          variant="tertiary"
          onPress={onResend}
        />
        <SecondaryButton label={c.changeEmail} variant="tertiary" onPress={onChangeEmail} />
      </View>
    </>
  );
}
