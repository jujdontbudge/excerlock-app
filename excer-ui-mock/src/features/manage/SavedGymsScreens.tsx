import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { autoDetectPrimer, savedGymDetailFixture, savedGymsCopy } from '@/content';
import {
  GradientScreen,
  PillButton,
  PillowCard,
  SettingsRow,
  colors,
  radius,
  space,
  type,
} from '@/design-system';

import { ChoiceRow, Intro, ManageSheet, ScreenHeader, manageFeatureStyles as s } from './components';

export type SavedGymRow = { id: string; name: string; subtitle: string };

export interface SavedGymsScreenProps {
  capacity?: number;
  gyms?: readonly SavedGymRow[];
  onAdd: () => void;
  onBack: () => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}

export function SavedGymsScreen({ capacity = 5, gyms = savedGymsCopy.rows, onAdd, onBack, onEdit, onRemove }: SavedGymsScreenProps) {
  const full = gyms.length >= capacity;
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader action={full ? undefined : onAdd} actionLabel="Add" onBack={onBack} title={savedGymsCopy.title} />
        <Text accessibilityLiveRegion="polite" style={s.label}>{gyms.length} of {capacity} gyms</Text>
        {gyms.length === 0 ? (
          <PillowCard>
            <View style={s.center}>
              <Text style={s.emptyTitle}>{savedGymsCopy.emptyTitle}</Text>
              <Text style={s.body}>{savedGymsCopy.emptyBody}</Text>
              <PillButton label={savedGymsCopy.addAction} onPress={onAdd} variant="screen" />
            </View>
          </PillowCard>
        ) : (
          <View style={s.cardGap}>
            {gyms.map((gym) => (
              <PillowCard key={gym.id} padding="none" variant="grouped">
                <SettingsRow onPress={() => onEdit(gym.id)} subtitle={gym.subtitle} title={gym.name} />
                <View style={s.divider} />
                <PillButton label={`Remove ${gym.name}`} onPress={() => onRemove(gym.id)} variant="text" />
              </PillowCard>
            ))}
          </View>
        )}
        <PillButton disabled={full} fullWidth label={savedGymsCopy.addAction} onPress={onAdd} variant="secondary" />
        {full ? <Text style={s.note}>{savedGymsCopy.capacityDisabledReason}</Text> : null}
        <Text style={s.note}>{savedGymsCopy.footer}</Text>
      </ScrollView>
    </GradientScreen>
  );
}

type GymField = 'name' | 'placeType' | 'radius' | 'mode' | 'wifi';
type GymFieldDraft = string | number;

export interface GymDetailScreenProps {
  autoPermission: 'notAsked' | 'granted' | 'denied';
  mode: 'manual' | 'auto';
  name: string;
  onBack: () => void;
  onChangeAutoPermission: (permission: 'granted' | 'denied') => void;
  onChangeMode: (mode: 'manual' | 'auto') => void;
  onChangeName: (name: string) => void;
  onChangePlaceType: (placeType: 'verified' | 'honor') => void;
  onChangeRadius: (radiusMeters: number) => void;
  onChangeWifi: (wifi: 'off' | 'sample') => void;
  onRemove?: () => void;
  onSave: () => void;
  placeType: 'verified' | 'honor';
  radiusMeters: number;
  screenTitle: string;
  wifi: 'off' | 'sample';
}

export function GymDetailScreen({
  autoPermission,
  mode,
  name,
  onBack,
  onChangeAutoPermission,
  onChangeMode,
  onChangeName,
  onChangePlaceType,
  onChangeRadius,
  onChangeWifi,
  onRemove,
  onSave,
  placeType,
  radiusMeters,
  screenTitle,
  wifi,
}: GymDetailScreenProps) {
  const [field, setField] = useState<GymField | null>(null);
  const [fieldDraft, setFieldDraft] = useState<GymFieldDraft>('');
  const [permissionSheetOpen, setPermissionSheetOpen] = useState(false);
  const [permissionDraft, setPermissionDraft] = useState<'granted' | 'denied'>('granted');
  const [mapQuery, setMapQuery] = useState('');
  const [pinPosition, setPinPosition] = useState(0);

  const openField = (nextField: GymField) => {
    const values: Record<GymField, GymFieldDraft> = {
      name,
      placeType,
      radius: radiusMeters,
      mode,
      wifi,
    };
    setFieldDraft(values[nextField]);
    setField(nextField);
  };

  const commitField = () => {
    if (field === 'name') onChangeName(String(fieldDraft).trim());
    if (field === 'placeType') onChangePlaceType(fieldDraft as 'verified' | 'honor');
    if (field === 'radius') onChangeRadius(Number(fieldDraft));
    if (field === 'mode') onChangeMode(fieldDraft as 'manual' | 'auto');
    if (field === 'wifi') onChangeWifi(fieldDraft as 'off' | 'sample');
    setField(null);
  };

  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader onBack={onBack} title={screenTitle} />
        <Intro body="Edit a local sample place. No map, Wi-Fi, or location service is used." label="PROTOTYPE MAP PREVIEW" />
        <PillowCard style={styles.map} variant="elevated">
          <TextInput
            accessibilityLabel="Search fictional sample places"
            autoCapitalize="words"
            onChangeText={setMapQuery}
            placeholder="Search fictional sample places"
            placeholderTextColor={colors.text.tertiary}
            returnKeyType="search"
            style={styles.mapSearch}
            value={mapQuery}
          />
          {mapQuery.trim() ? (
            <PillButton
              fullWidth
              label="Use fictional result"
              onPress={() => {
                onChangeName(mapQuery.trim().slice(0, 60));
                setPinPosition((current) => (current + 1) % 3);
              }}
              variant="secondary"
            />
          ) : null}
          <View style={[styles.radiusPreview, { height: 82 + radiusMeters / 2, width: 82 + radiusMeters / 2 }]}>
            <Text style={[styles.pin, pinPosition === 1 && styles.pinUpperRight, pinPosition === 2 && styles.pinLowerLeft]}>●</Text>
          </View>
          <Text style={styles.mapTitle}>Harbor district sample map</Text>
          <Text style={s.caption}>{radiusMeters} m preview radius · fake pin only</Text>
          <PillButton label="Move sample pin" onPress={() => setPinPosition((current) => (current + 1) % 3)} variant="secondary" />
        </PillowCard>

        <PillowCard padding="none" variant="grouped">
          <SettingsRow onPress={() => openField('name')} title={savedGymDetailFixture.fields.name.label} value={name || 'Required'} />
          <View style={s.divider} />
          <SettingsRow onPress={() => openField('placeType')} title={savedGymDetailFixture.fields.placeType.label} value={placeType === 'verified' ? 'Verified gym' : 'Honor system'} />
          <View style={s.divider} />
          <SettingsRow onPress={() => openField('radius')} subtitle="50–200 m" title={savedGymDetailFixture.fields.radius.label} value={`${radiusMeters} m`} />
          <View style={s.divider} />
          <SettingsRow onPress={() => openField('mode')} title={savedGymDetailFixture.fields.mode.label} value={mode === 'manual' ? 'Manual check-in' : 'Auto-detect'} />
          <View style={s.divider} />
          <SettingsRow
            onPress={() => openField('wifi')}
            subtitle={savedGymDetailFixture.wifiDisclosure}
            title={savedGymDetailFixture.fields.wifi.label}
            value={wifi === 'sample' ? savedGymDetailFixture.wifiSampleNetwork : 'Off'}
          />
        </PillowCard>
        <Text style={s.note}>{mode === 'manual' ? savedGymDetailFixture.manualSubtitle : savedGymDetailFixture.autoSubtitle}</Text>
        {mode === 'auto' ? (
          <PillowCard>
            <Text style={s.title}>
              {autoPermission === 'granted'
                ? 'Auto-detect preview is ready'
                : autoPermission === 'denied'
                  ? 'Manual check-in is still ready'
                  : autoDetectPrimer.title}
            </Text>
            <Text style={s.body}>
              {autoPermission === 'granted'
                ? 'The local fixture now represents Always Location as allowed. No permission was requested.'
                : autoPermission === 'denied'
                  ? autoDetectPrimer.notNowResult.body
                  : autoDetectPrimer.body}
            </Text>
            <Text style={s.note}>{autoDetectPrimer.disclosure}</Text>
            <PillButton
              fullWidth
              label={autoPermission === 'notAsked' ? autoDetectPrimer.primary : 'Preview permission again'}
              onPress={() => {
                setPermissionDraft(autoPermission === 'granted' ? 'granted' : 'denied');
                setPermissionSheetOpen(true);
              }}
              variant="secondary"
            />
            <PillButton fullWidth label="Keep manual check-in" onPress={() => onChangeMode('manual')} variant="text" />
          </PillowCard>
        ) : null}
        <PillButton disabled={!name.trim()} fullWidth label="Save gym" onPress={onSave} variant="screen" />
        <PillButton fullWidth label="Cancel" onPress={onBack} variant="text" />
        {onRemove ? <PillButton fullWidth label={savedGymDetailFixture.destructiveAction} onPress={onRemove} variant="destructive" /> : null}
      </ScrollView>

      <ManageSheet
        doneDisabled={field === 'name' && !String(fieldDraft).trim()}
        onCancel={() => setField(null)}
        onDone={commitField}
        title={field === 'name' ? 'Gym name' : field === 'placeType' ? 'Place type' : field === 'radius' ? 'Arrival radius' : field === 'mode' ? 'Check-in mode' : 'Wi-Fi confirmation'}
        visible={field !== null}
      >
        {field === 'name' ? (
          <>
            <Text style={s.note}>1–60 characters · local sample only</Text>
            <TextInput
              accessibilityLabel="Gym name"
              autoCapitalize="words"
              maxLength={60}
              onChangeText={setFieldDraft}
              placeholder="Sample gym name"
              placeholderTextColor={colors.text.tertiary}
              style={styles.nameInput}
              value={String(fieldDraft)}
            />
          </>
        ) : null}
        {field === 'placeType' ? (
          <View accessibilityLabel="Place type" accessibilityRole="radiogroup" style={s.cardGap}>
            <ChoiceRow label="Verified gym" onPress={() => setFieldDraft('verified')} selected={fieldDraft === 'verified'} subtitle="The sample place represents a listed fitness facility." />
            <ChoiceRow label="Honor system" onPress={() => setFieldDraft('honor')} selected={fieldDraft === 'honor'} subtitle="Use a place you identify yourself." />
          </View>
        ) : null}
        {field === 'radius' ? (
          <View accessibilityLabel="Arrival radius" accessibilityRole="radiogroup" style={s.cardGap}>
            {[50, 75, 100, 125, 150, 175, 200].map((meters) => (
              <ChoiceRow key={meters} label={`${meters} m`} onPress={() => setFieldDraft(meters)} selected={fieldDraft === meters} />
            ))}
          </View>
        ) : null}
        {field === 'mode' ? (
          <View accessibilityLabel="Check-in mode" accessibilityRole="radiogroup" style={s.cardGap}>
            <ChoiceRow label="Manual check-in" onPress={() => setFieldDraft('manual')} selected={fieldDraft === 'manual'} subtitle="Complete lighter-permission path." />
            <ChoiceRow label="Auto-detect" onPress={() => setFieldDraft('auto')} selected={fieldDraft === 'auto'} subtitle="Optional simulated Always Location path." />
          </View>
        ) : null}
        {field === 'wifi' ? (
          <View accessibilityLabel="Wi-Fi confirmation" accessibilityRole="radiogroup" style={s.cardGap}>
            <ChoiceRow label="Off" onPress={() => setFieldDraft('off')} selected={fieldDraft === 'off'} />
            <ChoiceRow label={`Use ${savedGymDetailFixture.wifiSampleNetwork}`} onPress={() => setFieldDraft('sample')} selected={fieldDraft === 'sample'} subtitle="Fake network name; nothing nearby is scanned or joined." />
          </View>
        ) : null}
      </ManageSheet>

      <ManageSheet
        onCancel={() => setPermissionSheetOpen(false)}
        onDone={() => {
          onChangeAutoPermission(permissionDraft);
          setPermissionSheetOpen(false);
        }}
        title="Preview Always Location"
        visible={permissionSheetOpen}
      >
        <Text style={s.body}>{autoDetectPrimer.body}</Text>
        <Text style={s.note}>{autoDetectPrimer.operationalNote}</Text>
        <View accessibilityLabel="Simulated permission result" accessibilityRole="radiogroup" style={s.cardGap}>
          <ChoiceRow label="Allow preview" onPress={() => setPermissionDraft('granted')} selected={permissionDraft === 'granted'} subtitle="Show the granted fixture without requesting permission." />
          <ChoiceRow label="Not now" onPress={() => setPermissionDraft('denied')} selected={permissionDraft === 'denied'} subtitle="Keep manual check-in available and show repair copy." />
        </View>
      </ManageSheet>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  map: { alignItems: 'center', gap: space[3], minHeight: 280, justifyContent: 'center' },
  mapSearch: {
    ...type.body,
    alignSelf: 'stretch',
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.divider,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text.primary,
    minHeight: 48,
    paddingHorizontal: space[4],
  },
  mapTitle: { ...type.cardTitle, color: colors.text.primary },
  nameInput: {
    ...type.body,
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.divider,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text.primary,
    minHeight: 52,
    paddingHorizontal: space[4],
  },
  pin: { ...type.sectionTitle, color: colors.brand.primary },
  pinLowerLeft: { transform: [{ translateX: -22 }, { translateY: 20 }] },
  pinUpperRight: { transform: [{ translateX: 24 }, { translateY: -18 }] },
  radiusPreview: {
    alignItems: 'center',
    backgroundColor: colors.surface.cardElevated,
    borderColor: colors.brand.primary,
    borderRadius: radius.pill,
    borderWidth: 2,
    justifyContent: 'center',
    maxHeight: 182,
    maxWidth: 182,
  },
});
