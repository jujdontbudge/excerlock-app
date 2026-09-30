import { Heading, TextField, PrimaryButton, SecondaryButton, Label } from '../../ui';
import { signInCopy as c } from './signInCopy';
export function EmailCodeScreen({
  code,
  onCode,
  onVerify,
  onResend,
  busy,
}: {
  code: string;
  onCode: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
  busy: boolean;
}) {
  return (
    <>
      <Heading title={c.codeTitle} centered />
      <Label tone="secondary" style={{ textAlign: 'center' }}>{c.codeBody}</Label>
      <TextField
        label={c.codeLabel}
        value={code}
        onChangeText={(value) => onCode(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        textContentType="oneTimeCode"
        autoFocus
      />
      <PrimaryButton label={c.verify} disabled={code.length !== 6} loading={busy} onPress={onVerify} />
      <SecondaryButton label={c.resend} loading={busy} variant="tertiary" onPress={onResend} />
    </>
  );
}
