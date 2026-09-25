import DateTimePicker from '@react-native-community/datetimepicker';
import { BottomSheet, PrimaryButton } from '../ui';
import { planCopy as c } from './planCopy';
import { tokens as t } from '../ui/tokens';
export function TimeSheet({
  which,
  value,
  onChange,
  onDismiss,
}: {
  which: 'start' | 'end' | null;
  value: number;
  onChange: (minute: number) => void;
  onDismiss: () => void;
}) {
  const date = new Date(2026, 0, 1, Math.floor(value / 60), value % 60);
  return (
    <BottomSheet open={which !== null} title={which === 'start' ? c.start : c.end} onDismiss={onDismiss}>
      <DateTimePicker
        accessibilityLabel={which === 'start' ? c.start : c.end}
        value={date}
        mode="time"
        display="spinner"
        themeVariant="light"
        textColor={t.text.primary}
        accentColor={t.brand.primary}
        minuteInterval={5}
        onValueChange={(_, next) => onChange(next.getHours() * 60 + next.getMinutes())}
      />
      <PrimaryButton label={c.done} onPress={onDismiss} />
    </BottomSheet>
  );
}
