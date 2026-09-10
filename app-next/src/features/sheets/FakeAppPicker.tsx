import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, TextField, Label, ChoiceRow, PrimaryButton } from '../../design-system';
import { LockedApps } from '../../domain/types';
import { tokens as t } from '../../design-system/tokens';
import { pickerCopy as c } from '../../content/pickers';
import { Reveal } from '../../motion/Reveal';
import { finishSelection, restoreSelection, toggleSelection } from './selection';
const colors = [t.icon.coral, t.icon.mint, t.icon.sky, t.icon.lilac, t.icon.yellow];
export function FakeAppPicker({
  initial,
  onResolve,
}: {
  initial: LockedApps;
  onResolve: (result: boolean | LockedApps) => void;
}) {
  const [query, setQuery] = useState(''),
    [selected, setSelected] = useState(() => restoreSelection(initial));
  const options = c.options.filter((o) => o.title.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <BottomSheet
      open
      title={c.title}
      onDismiss={() => onResolve(false)}
      footer={<PrimaryButton label={c.done} onPress={() => onResolve(finishSelection(selected))} />}>
      <TextField label={c.search} value={query} onChangeText={setQuery} />
      {(['category', 'app'] as const).map((kind) => (
        <View key={kind} style={{ gap: t.space.md }}>
          <Label variant="section">{kind === 'app' ? c.apps : c.categories}</Label>
          {options
            .filter((o) => o.kind === kind)
            .map((o, index) => (
              <Reveal key={o.id} index={index}>
                <ChoiceRow
                  title={o.title}
                  multiple
                  selected={selected.includes(o.id)}
                  onPress={() => setSelected(toggleSelection(selected, o.id))}
                  leading={
                    <View
                      style={{
                        width: t.layout.disc,
                        height: t.layout.disc,
                        borderRadius: t.radius.field,
                        backgroundColor: colors[c.options.findIndex((x) => x.id === o.id) % colors.length],
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Label variant="label">{kind === 'app' ? o.title.slice(-1) : o.title.charAt(0)}</Label>
                    </View>
                  }
                />
              </Reveal>
            ))}
        </View>
      ))}
      {!options.length ? (
        <Reveal>
          <Label tone="secondary">{c.noResults}</Label>
        </Reveal>
      ) : null}
    </BottomSheet>
  );
}
