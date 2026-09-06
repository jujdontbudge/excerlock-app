import { useState } from 'react';
import { View } from 'react-native';
import { TextField } from './TextField';
import { Label } from './Label';
import { PressableScale } from './PressableScale';
import { ChoiceRow } from './ChoiceRow';
import { Reveal } from '../motion/Reveal';
import { tokens as t } from './tokens';
import { controls } from '../content/controls';
export function NumberField({
  label,
  value,
  onChange,
  unit,
  units,
  onUnitChange,
  error,
  step = 1,
  min = 0,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: string;
  units?: readonly string[];
  onUnitChange?: (unit: string) => void;
  error?: string;
  step?: number;
  min?: number;
  max?: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: t.space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
        <View style={{ flex: 1 }}>
          <TextField
            label={label}
            accessibilityRole="adjustable"
            accessibilityValue={{
              now: value.trim() && Number.isFinite(Number(value)) ? Number(value) : undefined,
              min,
              max,
              text: `${value} ${unit}`.trim(),
            }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(e) => {
              if (!['increment', 'decrement'].includes(e.nativeEvent.actionName)) return;
              const current = Number(value) || min,
                next = current + (e.nativeEvent.actionName === 'increment' ? step : -step);
              onChange(String(Math.min(max ?? Infinity, Math.max(min, Number(next.toFixed(4))))));
            }}
            value={value}
            onChangeText={onChange}
            keyboardType="decimal-pad"
            error={error}
            style={{ ...t.type.metricSmall, fontVariant: ['tabular-nums'] }}
          />
        </View>
        {units && onUnitChange ? (
          <PressableScale label={`${controls.unit}: ${unit}`} onPress={() => setOpen(!open)}>
            <Label variant="label" style={{ color: t.brand.primary }}>
              {unit}
            </Label>
          </PressableScale>
        ) : (
          <Label tone="secondary">{unit}</Label>
        )}
      </View>
      {open ? (
        <Reveal style={{ gap: t.space.sm }}>
          {units?.map((u) => (
            <ChoiceRow
              key={u}
              title={u}
              selected={u === unit}
              onPress={() => {
                onUnitChange?.(u);
                setOpen(false);
              }}
            />
          ))}
        </Reveal>
      ) : null}
    </View>
  );
}
