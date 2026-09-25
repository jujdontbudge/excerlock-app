import { Heading, TextField, PrimaryButton, SecondaryButton, Label } from '../../design-system';
import { signInCopy as c } from '../../content/signIn';
import { tokens as t } from '../../design-system/tokens';
import { LivingIcon } from '../../motion/LivingIcon';
import { Reveal } from '../../motion/Reveal';
export function EmailCodeScreen({
  code,
  onCode,
  onVerify,
  onResend,
  busy,
  error,
  note,
}: {
  code: string;
  onCode: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
  busy: boolean;
  error: string;
  note: string;
}) {
  return (
    <>
      <Heading title={c.codeTitle} support={c.codeBody} />
      <LivingIcon name="mail" />
      <TextField
        label={c.codeLabel}
        value={code}
        onChangeText={(value) => onCode(value.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoFocus
        error={error || undefined}
      />
      {note ? (
        <Reveal>
          <Label style={{ color: t.state.success }}>{note}</Label>
        </Reveal>
      ) : null}
      <PrimaryButton label={c.verify} disabled={code.length !== 6} loading={busy} onPress={onVerify} />
      <SecondaryButton label={c.resend} disabled={busy} variant="tertiary" onPress={onResend} />
    </>
  );
}
