import { useState } from 'react';
import { Heading, SettingsGroup, SettingsRow, PrimaryButton, EmptyState, Label } from '../../design-system';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { settingsCopy as c } from '../../content/settings';
import { GymPicker } from '../sheets/GymPicker';
import { ConfirmSheet } from '../conditions/ConfirmSheet';
import { LivingIcon } from '../../motion/LivingIcon';
import { SettingsPage } from './SettingsPage';
export function GymsScreen({ onBack }: { onBack: () => void }) {
  const gyms = useSettingsStore((s) => s.data.gymPlaces),
    [adding, setAdding] = useState(false),
    [deleting, setDeleting] = useState<string | null>(null);
  return (
    <SettingsPage
      onBack={onBack}
      overlay={
        <>
          <GymPicker open={adding} onDismiss={() => setAdding(false)} />
          <ConfirmSheet
            open={!!deleting}
            title={c.removeGym}
            body={gyms.find((g) => g.id === deleting)?.name ?? ''}
            confirm={c.removeGym}
            cancel={c.close}
            onCancel={() => setDeleting(null)}
            onConfirm={() => {
              useSettingsStore.getState().patch({ gymPlaces: gyms.filter((g) => g.id !== deleting) });
              setDeleting(null);
            }}
          />
        </>
      }>
      <Heading title={c.gyms} />
      {gyms.length ? <LivingIcon name="map-pin" /> : null}
      {gyms.length ? (
        <SettingsGroup>
          {gyms.map((g) => (
            <SettingsRow key={g.id} title={g.name} value={g.address} icon="gym" onPress={() => setDeleting(g.id)} />
          ))}
        </SettingsGroup>
      ) : (
        <EmptyState icon="gym" title={c.noGyms} body={c.noGymsBody} />
      )}
      <Label tone="secondary">{c.gymLimit}</Label>
      <PrimaryButton label={c.addGym} disabled={gyms.length >= 5} onPress={() => setAdding(true)} />
    </SettingsPage>
  );
}
