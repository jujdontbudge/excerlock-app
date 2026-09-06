import { BottomSheet, Label, PrimaryButton, SecondaryButton } from '../../design-system';
export function ConfirmSheet({
  open,
  title,
  body,
  confirm,
  cancel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirm: string;
  cancel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <BottomSheet open={open} title={title} onDismiss={onCancel}>
      <Label>{body}</Label>
      <PrimaryButton label={confirm} onPress={onConfirm} />
      <SecondaryButton label={cancel} onPress={onCancel} />
    </BottomSheet>
  );
}
