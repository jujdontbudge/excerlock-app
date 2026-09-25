import { useState } from 'react';
import {
  Heading,
  SettingsGroup,
  SettingsRow,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
  Label,
} from '../ui';
import { settingsStore as useSettingsStore } from '../preferences/settingsStore';
import { settingsCopy as c } from './lib/settingsCopy';
import { GymPicker } from '../gyms/GymPicker';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { LivingIcon } from '../ui/LivingIcon';
import { SettingsPage } from '../ui/SettingsPage';
import { View } from 'react-native';
import { tokens as t } from '../ui/tokens';
export function GymsScreen({ onBack }: { onBack: () => void }) {
  const gyms = useSettingsStore((s) => s.data.gymPlaces),
    [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<string | undefined>(),
    [deleting, setDeleting] = useState<string | null>(null);
  return (
    <SettingsPage
      onBack={onBack}
      overlay={
        <>
          <GymPicker
            open={adding}
            placeId={editing}
            onDismiss={() => {
              setAdding(false);
              setEditing(undefined);
            }}
          />
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
            <View key={g.id} style={{ gap: t.space.sm }}>
              <SettingsRow
                title={g.name}
                subtitle={`${g.address} · ${g.radiusMeters} m`}
                icon="gym"
                onPress={() => {
                  setEditing(g.id);
                  setAdding(true);
                }}
              />
              <SecondaryButton label={`${c.removeGym}: ${g.name}`} onPress={() => setDeleting(g.id)} />
            </View>
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
