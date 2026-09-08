import { useState } from 'react';
import {
  Heading,
  SettingsGroup,
  SettingsRow,
  PrimaryButton,
  SecondaryButton,
  EmptyState,
  Label,
} from '../../design-system';
import { settingsStore as useSettingsStore } from '../../state/settingsStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { gymRulesToPause } from '../../domain/gymDependency';
import { syncGymDependency } from '../conditions/mutations';
import { settingsCopy as c } from '../../content/settings';
import { GymPicker } from '../sheets/GymPicker';
import { ConfirmSheet } from '../conditions/ConfirmSheet';
import { LivingIcon } from '../../motion/LivingIcon';
import { SettingsPage } from './SettingsPage';
import { View } from 'react-native';
import { tokens as t } from '../../design-system/tokens';
export function GymsScreen({ onBack }: { onBack: () => void }) {
  const gyms = useSettingsStore((s) => s.data.gymPlaces),
    rules = useRulesStore((s) => s.data.rules),
    [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<string | undefined>(),
    [deleting, setDeleting] = useState<string | null>(null);
  // What this removal would orphan: only losing the last gym leaves a gym condition without a signal (B24).
  const orphaned = deleting ? gymRulesToPause(rules, gyms.filter((g) => g.id !== deleting)) : [];
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
            title={c.removeGymTitle(gyms.find((g) => g.id === deleting)?.name ?? '')}
            body={orphaned.length ? c.removeGymBody(orphaned.length) : c.removeGymSafeBody}
            confirm={c.removeGym}
            cancel={c.close}
            onCancel={() => setDeleting(null)}
            onConfirm={() => {
              useSettingsStore.getState().patch({ gymPlaces: gyms.filter((g) => g.id !== deleting) });
              syncGymDependency();
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
