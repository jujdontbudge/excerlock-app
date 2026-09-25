import { useState } from 'react';
import { View } from 'react-native';
import { TextField } from './TextField';
import { Label } from '../Label';
import { PressableScale } from '../PressableScale';
import { ChoiceRow } from './ChoiceRow';
import type { ChoiceEmphasis } from './ActivityCard';
import { Reveal } from '../Reveal';
import { tokens as t } from '../tokens';
import { controls } from '../controlsCopy';
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
  labelTone = 'secondary',
  adjustValue,
  centered = false,
  emphasis,
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
  labelTone?: 'primary' | 'secondary';
  adjustValue?: (current: number, direction: 'increment' | 'decrement') => number;
  centered?: boolean;
  emphasis?: ChoiceEmphasis;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: t.space.lg }}>
      <View
        style={
          centered
            ? { alignItems: 'center', gap: t.space.md }
            : { flexDirection: 'row', alignItems: 'center', gap: t.space.md }
        }>
        <View style={centered ? { width: '100%', maxWidth: t.layout.fieldMax } : { flex: 1 }}>
          <TextField
            centered={centered}
            label={label}
            labelTone={labelTone}
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
              const direction = e.nativeEvent.actionName as 'increment' | 'decrement';
              const current = Number(value) || min,
                next = adjustValue?.(current, direction) ?? current + (direction === 'increment' ? step : -step);
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
            <Label variant="label" style={{ color: t.text.primary }}>
              {unit}
            </Label>
          </PressableScale>
        ) : (
          <Label>{unit}</Label>
        )}
      </View>
      {open ? (
        <Reveal style={{ gap: t.space.sm }}>
          {units?.map((u) => (
            <ChoiceRow
              key={u}
              title={u}
              selected={u === unit}
              emphasis={emphasis}
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
