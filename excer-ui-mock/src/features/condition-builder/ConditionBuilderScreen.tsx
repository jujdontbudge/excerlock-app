import { useState } from 'react';
import { ImageBackground, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  AccessibleModal,
  AccessibleModalTitle,
  ConditionCard,
  PillowCard,
  PillButton,
  PressableScale,
  SheetFrame,
  SwitchRow,
  colors,
  radius,
  space,
  type,
} from '@/design-system';
import {
  assetRegistry,
  bannerOptions,
  builderOptions,
  conditionCatalog,
  placePickerCopy,
  type AssetId,
} from '@/content';
import {
  formatClockMinutes,
  getBuilderRuleSummary,
  getEventCardSubtitle,
  getEventExecutionSummary,
  getRateQuantumSummary,
  getRewardSummary,
  type BuilderDraft,
  type DemoCondition,
  type RewardKind,
  type SavedGym,
} from '@/presentation';
import { OptionRow, PrototypeNotice } from '@/features/shared';

import { getCatalogAvailability, getPlaceAvailability } from './builderAvailability';

type BannerAssetId = AssetId<'banners'>;

function isBannerAssetId(id: string): id is BannerAssetId {
  return Object.prototype.hasOwnProperty.call(assetRegistry.banners, id);
}

const allBannerOptions = bannerOptions.reduce<Array<{
  id: string;
  label: string;
}>>((options, family) => [
  ...options,
  ...family.options.map((option) => ({
    id: option.id,
    label: option.label,
  })),
], []);

const runtimeBannerOptions = allBannerOptions.filter(
  (option): option is { id: BannerAssetId; label: string } =>
    isBannerAssetId(option.id),
);

const SAMPLE_PHOTO_BANNER_ID: BannerAssetId = 'general-city-motion';

export type ConditionBuilderScreenProps = {
  appleHealthAvailable?: boolean;
  canContinue: boolean;
  draft: BuilderDraft;
  existingConditions?: readonly DemoCondition[];
  onAddGym: () => void;
  onBack: () => void;
  onClose: () => void;
  onContinue: () => void;
  onDelete?: () => void;
  onEditGym: (gymId: string) => void;
  onPreviewAction: () => void;
  onSave: () => void;
  onSelectActiveWindow: (value: BuilderDraft['activeWindow']) => void;
  onSelectActiveWindowTime: (edge: 'start' | 'end', minutes: number) => void;
  onSelectBanner: (bannerId: string) => void;
  onSelectCatalog: (catalogId: string) => void;
  onSelectCooldown: (minutes: number) => void;
  onSelectDailyCap: (value: number | 'unlimited') => void;
  onSetEnabled: (enabled: boolean) => void;
  onSetName: (name: string) => void;
  onSelectEventThreshold: (value: number) => void;
  onSelectGym: (gymId: string) => void;
  onSelectRateMinutes: (minutes: number) => void;
  onSelectRepeatable: (value: boolean) => void;
  onSelectReward: (reward: RewardKind, minutes?: number) => void;
  onSelectStateGrace: (seconds: number) => void;
  primaryLabel: string;
  savedGyms: readonly SavedGym[];
  title: string;
  units?: 'miles' | 'kilometers';
};

export function ConditionBuilderScreen({
  appleHealthAvailable = true,
  canContinue,
  draft,
  existingConditions = [],
  onAddGym,
  onBack,
  onClose,
  onContinue,
  onDelete,
  onEditGym,
  onPreviewAction,
  onSave,
  onSelectActiveWindow,
  onSelectActiveWindowTime,
  onSelectBanner,
  onSelectCatalog,
  onSelectCooldown,
  onSelectDailyCap,
  onSetEnabled,
  onSetName,
  onSelectEventThreshold,
  onSelectGym,
  onSelectRateMinutes,
  onSelectRepeatable,
  onSelectReward,
  onSelectStateGrace,
  primaryLabel,
  savedGyms,
  title,
  units = 'kilometers',
}: ConditionBuilderScreenProps) {
  const [catalogFilter, setCatalogFilter] = useState('All');
  const [bannerFilter, setBannerFilter] = useState('All');
  const [photoPhase, setPhotoPhase] = useState<'picker' | 'crop' | null>(null);
  const showBack = draft.path.indexOf(draft.step) > 0;
  const visibleCatalog = conditionCatalog.filter((entry) => catalogFilter === 'All' || entry.group === catalogFilter);
  const visibleBanners = runtimeBannerOptions.filter((option) => {
    if (bannerFilter === 'All') return true;
    const family = bannerOptions.find((group) => group.options.some((entry) => entry.id === option.id))?.family;
    return family === bannerFilter;
  });
  const selectedBannerSource = draft.bannerId && isBannerAssetId(draft.bannerId)
    ? assetRegistry.banners[draft.bannerId]
    : null;
  const selectedGym = savedGyms.find((gym) => gym.id === draft.gymId);
  const selectedCatalog = conditionCatalog.find((entry) => entry.id === draft.catalogId);
  const editAvailability = selectedCatalog
    ? getPlaceAvailability({
        candidate: selectedCatalog,
        existingConditions,
        gymId: draft.gymId ?? undefined,
      })
    : { available: true };
  const ruleSummary = getBuilderRuleSummary(draft, units, selectedGym?.name);
  const footer = draft.step === 'catalog' ? undefined : (
    <PillButton
      disabled={!canContinue}
      fullWidth
      label={primaryLabel}
      onPress={draft.step === 'preview' ? onSave : onContinue}
      variant="screen"
    />
  );

  return (
    <SheetFrame footer={footer} onBack={showBack ? onBack : undefined} onClose={onClose} title={title}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((draft.path.indexOf(draft.step) + 1) / draft.path.length) * 100}%` }]} />
      </View>
      <Text style={styles.body}>{bodyForStep(draft.step)}</Text>

      {draft.editingConditionId && draft.step !== 'catalog' ? (
        <PillowCard padding="none" style={styles.editIdentity} variant="grouped">
          <View style={styles.nameField}>
            <Text style={styles.fieldLabel}>Condition name</Text>
            <TextInput
              accessibilityLabel="Condition name"
              maxLength={60}
              onChangeText={onSetName}
              placeholder="Name this condition"
              placeholderTextColor={colors.text.tertiary}
              style={styles.nameInput}
              value={draft.name}
            />
          </View>
          <View style={styles.identityDivider} />
          <SwitchRow
            onValueChange={onSetEnabled}
            subtitle={draft.enabled && !editAvailability.available
              ? editAvailability.reason
              : 'Disabled conditions keep their sample history.'}
            title="Enabled"
            value={draft.enabled}
          />
        </PillowCard>
      ) : null}

      {draft.step === 'catalog' ? (
        <View style={styles.list}>
          <View accessibilityLabel="Condition categories" accessibilityRole="radiogroup" style={styles.filterRow}>
            {['All', ...new Set(conditionCatalog.map((entry) => entry.group))].map((filter) => (
              <PressableScale
                accessibilityLabel={`Show ${filter} conditions`}
                accessibilityRole="radio"
                accessibilityState={{ selected: catalogFilter === filter }}
                key={filter}
                onPress={() => setCatalogFilter(filter)}
              >
                <View style={[styles.filterChip, catalogFilter === filter && styles.filterChipSelected]}>
                  <Text style={[styles.filterText, catalogFilter === filter && styles.choiceLabelSelected]}>{filter}</Text>
                </View>
              </PressableScale>
            ))}
          </View>
          {visibleCatalog.map((entry) => {
            const availability = getCatalogAvailability({
              appleHealthAvailable,
              candidate: entry,
              existingConditions,
              savedGyms,
            });
            return (
              <OptionRow
                disabled={!availability.available}
                key={entry.id}
                label={entry.label}
                onPress={() => onSelectCatalog(entry.id)}
                subtitle={availability.reason ?? `${entry.sourceLabel} · ${entry.description}`}
                trailing={!availability.available ? 'Unavailable' : undefined}
              />
            );
          })}
        </View>
      ) : null}

      {draft.step === 'place' ? (
        <View style={styles.list}>
          <PrototypeNotice>{placePickerCopy.disclosure}</PrototypeNotice>
          {savedGyms.length === 0 ? (
            <PillowCard style={styles.emptyGymCard}>
              <Text style={styles.previewTitle}>No saved gyms yet</Text>
              <Text style={styles.previewBody}>Add a local sample gym, then return here to select it.</Text>
            </PillowCard>
          ) : savedGyms.map((gym) => {
            const availability = selectedCatalog
              ? getPlaceAvailability({
                  candidate: selectedCatalog,
                  existingConditions,
                  gymId: gym.id,
                })
              : { available: false, reason: 'Choose a condition first.' };
            return (
              <View key={gym.id} style={styles.gymRow}>
                <View style={styles.gymChoice}>
                  <OptionRow
                    disabled={!availability.available}
                    label={gym.name}
                    onPress={() => onSelectGym(gym.id)}
                    selected={draft.gymId === gym.id}
                    subtitle={availability.reason ?? `${gym.placeType === 'verified' ? 'Verified place' : 'Honor system'} · ${gym.radiusMeters} m · ${gym.detection === 'auto' ? 'Auto-detect' : 'Manual'}`}
                    trailing={!availability.available
                      ? availability.reason?.startsWith('Already') ? 'Added' : 'Unavailable'
                      : undefined}
                  />
                </View>
                <PillButton label="Edit" onPress={() => onEditGym(gym.id)} variant="text" />
              </View>
            );
          })}
          <PillButton
            disabled={savedGyms.length >= 5}
            fullWidth
            label={savedGyms.length >= 5 ? '5 of 5 gyms saved' : 'Add a sample gym'}
            onPress={onAddGym}
            variant="secondary"
          />
          {savedGyms.length >= 5 ? <Text style={styles.previewBody}>Remove a saved gym before adding another.</Text> : null}
        </View>
      ) : null}

      {draft.step === 'configure-event' ? (
        draft.catalogId === 'gym-arrive' ? (
          <OptionRow
            disabled
            label="Arrival check-in"
            onPress={() => undefined}
            selected
            subtitle="Thresholdless · fires on sample verification. No exercise value is invented."
          />
        ) : (
          <NumericStepper
            {...eventRangeFor(draft.catalogId, units)}
            onChange={onSelectEventThreshold}
            value={draft.eventThreshold}
          />
        )
      ) : null}

      {draft.step === 'configure-state' ? (
        <View style={styles.list}>
          <Text style={styles.fieldLabel}>Grace period</Text>
          <ChoiceGrid
            options={builderOptions.stateGrace.map((option) => ({ label: option.label, value: option.value }))}
            onSelect={onSelectStateGrace}
            selected={draft.stateGraceSeconds}
          />
          <ActiveWindowPicker
            draft={draft}
            onSelectMode={onSelectActiveWindow}
            onSelectTime={onSelectActiveWindowTime}
          />
        </View>
      ) : null}

      {draft.step === 'configure-rate' ? (
        <>
          <Text style={styles.fieldLabel}>Minutes earned per signal</Text>
          <NumericStepper label="minutes" max={60} min={5} onChange={onSelectRateMinutes} step={5} value={draft.rateMinutes} />
          {draft.catalogId ? (
            <Text style={styles.previewBody}>
              {getRateQuantumSummary(draft.catalogId, draft.rateMinutes, units)}
            </Text>
          ) : null}
          <ActiveWindowPicker
            draft={draft}
            onSelectMode={onSelectActiveWindow}
            onSelectTime={onSelectActiveWindowTime}
          />
          <PrototypeNotice>Rate conditions credit continuously and never have a daily cap or Claim action.</PrototypeNotice>
        </>
      ) : null}

      {draft.step === 'reward' ? (
        <View style={styles.list}>
          {builderOptions.eventRewards.choices.map((reward) => (
            <OptionRow
              key={reward.id}
              label={reward.label}
              onPress={() => onSelectReward(reward.id)}
              selected={draft.reward === reward.id}
              subtitle={reward.subtitle}
            />
          ))}
          {draft.reward === 'fixed' ? (
            <NumericStepper
              label="minutes added"
              max={120}
              min={5}
              onChange={(minutes) => onSelectReward('fixed', minutes)}
              step={5}
              value={draft.rewardMinutes}
            />
          ) : null}
          {draft.reward === 'set-period' ? (
            <NumericStepper
              label="minutes open"
              max={240}
              min={15}
              onChange={(minutes) => onSelectReward('set-period', minutes)}
              step={15}
              value={draft.rewardMinutes}
            />
          ) : null}
          <Text style={styles.fieldLabel}>Completions per day</Text>
          <StringChoiceGrid
            onSelect={(value) => onSelectDailyCap(value === 'unlimited' ? 'unlimited' : Number(value))}
            options={[
              ...Array.from({ length: 10 }, (_, index) => ({
                label: index === 0 ? 'Once' : `${index + 1} times`,
                value: String(index + 1),
              })),
              { label: 'Unlimited', value: 'unlimited' },
            ]}
            selected={String(draft.dailyCap ?? '')}
          />
          <Text style={styles.fieldLabel}>Cooldown</Text>
          <ChoiceGrid
            onSelect={onSelectCooldown}
            options={[
              { label: 'Off', value: 0 },
              { label: '1 hour', value: 60 },
              { label: '4 hours', value: 240 },
            ]}
            selected={draft.cooldownMinutes}
          />
          <NumericStepper
            formatValue={(minutes) => minutes === 0
              ? 'Off'
              : minutes < 60
                ? `${minutes} min`
                : `${minutes / 60} h`}
            label="cooldown"
            max={480}
            min={0}
            onChange={onSelectCooldown}
            step={15}
            value={draft.cooldownMinutes}
          />
          <Text style={styles.fieldLabel}>Repeatable</Text>
          <StringChoiceGrid
            onSelect={(value) => onSelectRepeatable(value === 'yes')}
            options={[{ label: 'No', value: 'no' }, { label: 'Yes', value: 'yes' }]}
            selected={draft.repeatable === null ? '' : draft.repeatable ? 'yes' : 'no'}
          />
          <PrototypeNotice>
            No allows one completion, so a higher selected cap stays visible but inactive. With Yes, the daily cap and cooldown govern each later local demo completion.
          </PrototypeNotice>
          <ActiveWindowPicker
            draft={draft}
            onSelectMode={onSelectActiveWindow}
            onSelectTime={onSelectActiveWindowTime}
          />
        </View>
      ) : null}

      {draft.step === 'banner' ? (
        <View style={styles.list}>
          <PillButton fullWidth label="Choose a sample photo…" onPress={() => setPhotoPhase('picker')} variant="secondary" />
          <PrototypeNotice>The photo picker is simulated and never requests library access.</PrototypeNotice>
          <View accessibilityLabel="Artwork categories" accessibilityRole="radiogroup" style={styles.filterRow}>
            {['All', ...bannerOptions.filter((group) => group.family !== 'User').map((group) => group.family)].map((filter) => (
              <PressableScale
                accessibilityLabel={`Show ${filter} artwork`}
                accessibilityRole="radio"
                accessibilityState={{ selected: bannerFilter === filter }}
                key={filter}
                onPress={() => setBannerFilter(filter)}
              >
                <View style={[styles.filterChip, bannerFilter === filter && styles.filterChipSelected]}>
                  <Text style={[styles.filterText, bannerFilter === filter && styles.choiceLabelSelected]}>{filter}</Text>
                </View>
              </PressableScale>
            ))}
          </View>
          <View style={styles.bannerGrid}>{visibleBanners.map((option) => (
            <PressableScale
              accessibilityLabel={`${option.label}${draft.bannerId === option.id ? ', selected' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ selected: draft.bannerId === option.id }}
              key={option.id}
              onPress={() => onSelectBanner(option.id)}
              style={styles.bannerHost}
            >
              <ImageBackground
                imageStyle={styles.bannerImage}
                source={assetRegistry.banners[option.id]}
                style={[styles.bannerChoice, draft.bannerId === option.id && styles.bannerSelected]}
              >
                <View style={styles.bannerScrim}><Text style={styles.bannerLabel}>{option.label}</Text></View>
              </ImageBackground>
            </PressableScale>
          ))}</View>
        </View>
      ) : null}

      {draft.step === 'preview' && draft.kind && selectedBannerSource ? (
        <View style={styles.preview}>
          {draft.kind === 'event' ? (
            <ConditionCard
              actionLabel="Complete"
              banner={selectedBannerSource}
              onAction={onPreviewAction}
              onInfo={onPreviewAction}
              onOpen={onPreviewAction}
              status="eligible"
              subtitle={draft.catalogId
                ? getEventCardSubtitle(ruleSummary, draft.catalogId)
                : 'Ready when your goal is met'}
              title={draft.name}
              variant="event"
            />
          ) : draft.kind === 'state' ? (
            <ConditionCard
              actionLabel={draft.catalogId?.startsWith('gym-') ? 'Check in' : 'Start walking'}
              banner={selectedBannerSource}
              onAction={onPreviewAction}
              onInfo={onPreviewAction}
              onOpen={onPreviewAction}
              status="inactive"
              subtitle={selectedGym
                ? `Check in at ${selectedGym.name} to keep apps open`
                : 'Start a walking session to keep apps open while moving'}
              title={draft.name}
              variant="state"
            />
          ) : (
            <ConditionCard
              banner={selectedBannerSource}
              earnedValue="0 min earned"
              onInfo={onPreviewAction}
              onOpen={onPreviewAction}
              progress={0}
              ratioLabel={draft.catalogId
                ? getRateQuantumSummary(draft.catalogId, draft.rateMinutes, units)
                : `Configured signal = ${draft.rateMinutes ?? 5} min`}
              sourceValue="0 today"
              title={draft.name}
              variant="rate"
            />
          )}
          <PillowCard>
            <Text style={styles.previewTitle}>Configured rule</Text>
            <Text style={styles.previewBody}>{ruleSummary}</Text>
            {draft.kind === 'event' ? (
              <Text style={styles.previewBody}>
                Demo execution: {getRewardSummary(draft)} · {getEventExecutionSummary(draft)}.
              </Text>
            ) : null}
            <Text style={styles.previewBody}>This uses the same card contract as Home. It is saved only after you tap {primaryLabel}.</Text>
          </PillowCard>
          {onDelete ? <PillButton fullWidth label="Delete condition" onPress={onDelete} variant="secondary" /> : null}
        </View>
      ) : null}

      <AccessibleModal
        accessibilityTitle={photoPhase === 'crop' ? 'Crop sample photo' : 'Sample photo library'}
        animationType="slide"
        onRequestClose={() => setPhotoPhase(null)}
        style={styles.photoModalBackdrop}
        visible={photoPhase !== null}
      >
        <View style={styles.photoSheet}>
          <Text style={styles.photoEyebrow}>
            {photoPhase === 'crop' ? 'LOCAL CROP PREVIEW' : 'SIMULATED NATIVE PHOTO PICKER'}
          </Text>
          <AccessibleModalTitle style={styles.photoTitle}>
            {photoPhase === 'crop' ? 'Crop sample photo' : 'Sample photo library'}
          </AccessibleModalTitle>
          <Text style={styles.photoBody}>
            {photoPhase === 'crop'
              ? 'This hardcoded local crop preview uses bundled artwork. Dragging and zooming are intentionally simulated.'
              : 'No photo-library permission is requested. This fixture offers one bundled sample and never reads device photos.'}
          </Text>
          <ImageBackground
            accessibilityLabel={photoPhase === 'crop' ? 'Hardcoded city-motion crop preview' : 'Bundled city-motion sample photo'}
            imageStyle={styles.photoImage}
            source={assetRegistry.banners[SAMPLE_PHOTO_BANNER_ID]}
            style={styles.photoPreview}
          >
            {photoPhase === 'crop' ? <View accessibilityLabel="Crop boundary" style={styles.cropBoundary} /> : null}
          </ImageBackground>
          {photoPhase === 'crop' ? (
            <View style={styles.photoActions}>
              <PillButton fullWidth label="Use crop" onPress={() => {
                onSelectBanner(SAMPLE_PHOTO_BANNER_ID);
                setPhotoPhase(null);
              }} variant="dark" />
              <PillButton fullWidth label="Choose another" onPress={() => setPhotoPhase('picker')} variant="secondary" />
            </View>
          ) : (
            <View style={styles.photoActions}>
              <PillButton fullWidth label="Choose sample photo" onPress={() => setPhotoPhase('crop')} variant="dark" />
              <PillButton fullWidth label="Cancel" onPress={() => setPhotoPhase(null)} variant="secondary" />
            </View>
          )}
        </View>
      </AccessibleModal>
    </SheetFrame>
  );
}

function StringChoiceGrid<T extends string>({
  onSelect,
  options,
  selected,
}: {
  onSelect: (value: T) => void;
  options: readonly { label: string; value: T }[];
  selected: string;
}) {
  return (
    <View style={styles.choiceGrid}>
      {options.map((option) => (
        <PressableScale
          accessibilityLabel={option.label}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === option.value }}
          key={option.value}
          onPress={() => onSelect(option.value)}
        >
          <View style={[styles.choice, selected === option.value && styles.choiceSelected]}>
            <Text style={[styles.choiceLabel, selected === option.value && styles.choiceLabelSelected]}>{option.label}</Text>
          </View>
        </PressableScale>
      ))}
    </View>
  );
}

function NumericStepper({
  formatValue,
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  formatValue?: (value: number) => string;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  value: number | null;
}) {
  const canDecrease = value !== null && value > min;
  const canIncrease = value === null || value < max;
  const change = (direction: -1 | 1) => {
    const next = value === null
      ? min
      : Math.min(max, Math.max(min, Number((value + direction * step).toFixed(2))));
    onChange(next);
  };
  return (
    <View
      accessible
      accessibilityActions={[
        ...(canDecrease ? [{ label: `Decrease ${label}`, name: 'decrement' as const }] : []),
        ...(canIncrease ? [{ label: `Increase ${label}`, name: 'increment' as const }] : []),
      ]}
      accessibilityLabel={`${label}, ${value ?? 'not chosen'}`}
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value ?? undefined }}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'decrement' && canDecrease) change(-1);
        if (event.nativeEvent.actionName === 'increment' && canIncrease) change(1);
      }}
      style={styles.stepper}
    >
      <PressableScale accessibilityLabel={`Decrease ${label}`} accessibilityRole="button" disabled={!canDecrease} onPress={() => change(-1)}>
        <View style={styles.stepperButton}><Text style={styles.stepperButtonText}>−</Text></View>
      </PressableScale>
      <Text accessibilityLiveRegion="polite" style={styles.stepperValue}>
        {value === null ? 'Choose' : formatValue?.(value) ?? `${value} ${label}`}
      </Text>
      <PressableScale accessibilityLabel={`Increase ${label}`} accessibilityRole="button" disabled={!canIncrease} onPress={() => change(1)}>
        <View style={styles.stepperButton}><Text style={styles.stepperButtonText}>+</Text></View>
      </PressableScale>
    </View>
  );
}

function ActiveWindowPicker({
  draft,
  onSelectMode,
  onSelectTime,
}: {
  draft: BuilderDraft;
  onSelectMode: (value: BuilderDraft['activeWindow']) => void;
  onSelectTime: (edge: 'start' | 'end', minutes: number) => void;
}) {
  const selectedMode = draft.activeWindow === 'guided' ? 'start-end' : draft.activeWindow;
  const hasStart = selectedMode === 'start-only' || selectedMode === 'start-end';
  const hasEnd = selectedMode === 'end-only' || selectedMode === 'start-end';
  return (
    <View style={styles.windowPicker}>
      <Text style={styles.fieldLabel}>Active window</Text>
      <StringChoiceGrid
        onSelect={onSelectMode}
        options={[
          { label: 'Anytime', value: 'anytime' },
          { label: 'Start time only', value: 'start-only' },
          { label: 'End time only', value: 'end-only' },
          { label: 'Start and end', value: 'start-end' },
        ]}
        selected={selectedMode}
      />
      {hasStart ? (
        <>
          <Text style={styles.fieldLabel}>Start time</Text>
          <NumericStepper
            formatValue={(minutes) => formatClockMinutes(minutes) ?? 'Choose'}
            label="start time"
            max={1439}
            min={0}
            onChange={(minutes) => onSelectTime('start', minutes)}
            step={1}
            value={draft.activeWindowStartMinutes}
          />
        </>
      ) : null}
      {hasEnd ? (
        <>
          <Text style={styles.fieldLabel}>End time</Text>
          <NumericStepper
            formatValue={(minutes) => formatClockMinutes(minutes) ?? 'Choose'}
            label="end time"
            max={1439}
            min={0}
            onChange={(minutes) => onSelectTime('end', minutes)}
            step={1}
            value={draft.activeWindowEndMinutes}
          />
        </>
      ) : null}
    </View>
  );
}

export function eventRangeFor(catalogId: string | null, units: 'miles' | 'kilometers') {
  if (catalogId === 'walk-steps-event') return { label: 'steps', min: 1000, max: 30000, step: 500 };
  if (catalogId?.startsWith('run-')) return units === 'miles'
    ? { label: 'miles', min: 1, max: 26, step: 0.5 }
    : { label: 'kilometers', min: 1, max: 42, step: 0.5 };
  if (catalogId?.startsWith('cycle-')) return units === 'miles'
    ? { label: 'miles', min: 3, max: 120, step: 3 }
    : { label: 'kilometers', min: 5, max: 200, step: 5 };
  if (catalogId?.startsWith('swim-')) return { label: 'meters', min: 100, max: 5000, step: 100 };
  if (catalogId === 'calories-event') return { label: 'active calories', min: 50, max: 2000, step: 50 };
  if (catalogId === 'active-minutes-event') return { label: 'active minutes', min: 10, max: 180, step: 5 };
  return { label: 'workout minutes', min: 10, max: 120, step: 5 };
}

function ChoiceGrid({
  onSelect,
  options,
  selected,
}: {
  onSelect: (value: number) => void;
  options: Array<{ label: string; value: number }> | readonly { label: string; value: number }[];
  selected: number | null;
}) {
  return (
    <View style={styles.choiceGrid}>
      {options.map((option) => (
        <PressableScale
          accessibilityLabel={option.label}
          accessibilityRole="button"
          accessibilityState={{ selected: selected === option.value }}
          key={option.value}
          onPress={() => onSelect(option.value)}
        >
          <View style={[styles.choice, selected === option.value && styles.choiceSelected]}>
            <Text style={[styles.choiceLabel, selected === option.value && styles.choiceLabelSelected]}>{option.label}</Text>
          </View>
        </PressableScale>
      ))}
    </View>
  );
}

function bodyForStep(step: BuilderDraft['step']) {
  switch (step) {
    case 'catalog': return 'Pick the outcome that feels natural. The condition kind stays behind the scenes.';
    case 'place': return 'Select a saved sample place or add one locally.';
    case 'configure-event': return 'Choose the threshold that makes this count. Nothing is prefilled.';
    case 'configure-state': return 'Choose a grace period and, if useful, an active window.';
    case 'configure-rate': return 'Choose how many minutes this signal adds. Nothing is prefilled.';
    case 'reward': return 'Decide what one completed event adds or opens.';
    case 'banner': return 'Pick the banner this condition will wear on Home and Manage.';
    case 'preview': return 'This is the exact card that will appear on Home.';
  }
}

const styles = StyleSheet.create({
  bannerChoice: { height: 112, justifyContent: 'flex-end' },
  bannerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginTop: space[4] },
  bannerHost: { width: '47%' },
  bannerImage: { borderRadius: radius.card },
  bannerLabel: { ...type.label, color: colors.text.primary },
  bannerScrim: { backgroundColor: 'rgba(18,12,5,0.64)', borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card, padding: space[3] },
  bannerSelected: { borderColor: colors.brand.signatureAmber, borderRadius: radius.card, borderWidth: 3 },
  body: { ...type.body, color: colors.text.secondary, marginTop: space[3] },
  choice: { alignItems: 'center', backgroundColor: colors.surface.cardElevated, borderRadius: radius.pill, justifyContent: 'center', minHeight: 50, minWidth: 88, paddingHorizontal: space[3] },
  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[4] },
  choiceLabel: { ...type.label, color: colors.text.primary },
  choiceLabelSelected: { color: colors.text.ink },
  choiceSelected: { backgroundColor: colors.surface.light },
  editIdentity: { marginTop: space[4] },
  emptyGymCard: { gap: space[1] },
  fieldLabel: { ...type.label, color: colors.text.secondary, marginTop: space[2] },
  filterChip: { backgroundColor: colors.surface.cardElevated, borderRadius: radius.pill, paddingHorizontal: space[3], paddingVertical: space[2] },
  filterChipSelected: { backgroundColor: colors.surface.light },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  filterText: { ...type.caption, color: colors.text.primary },
  gymChoice: { flex: 1, minWidth: 0 },
  gymRow: { alignItems: 'center', flexDirection: 'row', gap: space[1] },
  identityDivider: { backgroundColor: colors.surface.divider, height: StyleSheet.hairlineWidth },
  list: { gap: space[2], marginTop: space[4] },
  nameField: { gap: space[2], padding: space[4] },
  nameInput: { ...type.body, backgroundColor: colors.surface.cardStrong, borderRadius: radius.actionRow, color: colors.text.primary, minHeight: 48, paddingHorizontal: space[3] },
  preview: { gap: space[4], marginTop: space[5] },
  previewBody: { ...type.body, color: colors.text.secondary, marginTop: space[2] },
  previewTitle: { ...type.cardTitle, color: colors.text.primary },
  cropBoundary: { borderColor: colors.surface.light, borderWidth: 2, flex: 1, margin: space[4] },
  photoActions: { gap: space[2] },
  photoBody: { ...type.body, color: colors.text.secondary },
  photoEyebrow: { ...type.micro, color: colors.brand.signatureAmber },
  photoImage: { borderRadius: radius.card },
  photoModalBackdrop: { backgroundColor: 'rgba(0,0,0,0.58)', flex: 1, justifyContent: 'flex-end' },
  photoPreview: { borderRadius: radius.card, height: 210, justifyContent: 'center', overflow: 'hidden' },
  photoSheet: { backgroundColor: colors.surface.cardStrong, borderTopLeftRadius: radius.cardLarge, borderTopRightRadius: radius.cardLarge, gap: space[4], padding: space[5], paddingBottom: space[8] },
  photoTitle: { ...type.sectionTitle, color: colors.text.primary },
  progressFill: { backgroundColor: colors.brand.signatureAmber, borderRadius: radius.pill, height: 4 },
  progressTrack: { backgroundColor: colors.surface.trackDark, borderRadius: radius.pill, height: 4 },
  stepper: { alignItems: 'center', flexDirection: 'row', gap: space[4], justifyContent: 'center', marginTop: space[3] },
  stepperButton: { alignItems: 'center', backgroundColor: colors.surface.light, borderRadius: radius.pill, height: 48, justifyContent: 'center', width: 48 },
  stepperButtonText: { ...type.sectionTitle, color: colors.text.ink },
  stepperValue: { ...type.sectionTitle, color: colors.text.primary, minWidth: 140, textAlign: 'center' },
  windowPicker: { gap: space[2] },
});
