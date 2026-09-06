import { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { BottomSheet, TextField, ChoiceRow, PrimaryButton, Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { pickerCopy as c } from '../../content/pickers';
import { SavedPlace } from '../../ports/models';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { Reveal } from '../../motion/Reveal';
export function GymPicker({
  open,
  onDismiss,
  onSaved,
}: {
  open: boolean;
  onDismiss: () => void;
  onSaved?: () => void;
}) {
  return open ? <Picker onDismiss={onDismiss} onSaved={onSaved} /> : null;
}
function Picker({ onDismiss, onSaved }: { onDismiss: () => void; onSaved?: () => void }) {
  const runtime = useRuntime(),
    saved = useSettingsStore((s) => s.data.gymPlaces),
    [query, setQuery] = useState(''),
    [results, setResults] = useState<SavedPlace[]>([]),
    [place, setPlace] = useState<SavedPlace | null>(null),
    [name, setName] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void runtime.gym.searchPlaces(query).then((items) => {
      if (active) setResults(items);
    });
    return () => {
      active = false;
    };
  }, [runtime, query]);
  const limit = saved.length >= 5 && !saved.some((p) => p.id === place?.id);
  const save = async () => {
    if (!place || !name.trim() || limit) return;
    setBusy(true);
    try {
      await runtime.gym.savePlace({ ...place, name: name.trim() });
      onSaved?.();
      onDismiss();
    } catch {
      setError(c.saveError);
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet
      open
      title={c.gymTitle}
      onDismiss={onDismiss}
      footer={
        <PrimaryButton label={c.save} disabled={!place || !name.trim() || limit} loading={busy} onPress={save} />
      }>
      <TextField label={c.gymSearch} value={query} onChangeText={setQuery} />
      <Reveal style={{ width: '100%', aspectRatio: t.layout.mapAspect }}>
        <Image
          source={require('../../../assets/images/map-placeholder.png')}
          accessibilityLabel={c.map}
          style={{ width: '100%', height: '100%', borderRadius: t.radius.card }}
        />
      </Reveal>
      {[...saved, ...results.filter((r) => !saved.some((s) => s.id === r.id))].map((item, index) => (
        <Reveal key={item.id} index={index}>
          <ChoiceRow
            title={item.name}
            support={item.address}
            icon="map-pin"
            selected={place?.id === item.id}
            onPress={() => {
              setPlace(item);
              setName(item.name);
              setError('');
            }}
          />
        </Reveal>
      ))}
      {place ? (
        <Reveal>
          <TextField
            label={c.gymName}
            value={name}
            onChangeText={setName}
            error={name.trim() ? undefined : c.nameError}
          />
        </Reveal>
      ) : null}
      {limit || error ? (
        <Reveal>
          <Label style={{ color: t.state.error }}>{limit ? c.limit : error}</Label>
        </Reveal>
      ) : null}
    </BottomSheet>
  );
}
