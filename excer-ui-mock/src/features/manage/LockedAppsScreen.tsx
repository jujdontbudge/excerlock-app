import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { lockedAppsCopy, sampleAppGroups } from '@/content';
import {
  DottedSeparator,
  GradientScreen,
  PillButton,
  PillowCard,
  PressableScale,
  SelectableBubble,
  SwitchRow,
  colors,
  layout,
  radius,
  space,
  type,
} from '@/design-system';

import { Intro, ScreenHeader, SectionLabel, manageFeatureStyles as s } from './components';

export interface LockedAppsScreenProps {
  onBack: () => void;
  onDone: () => void;
  onOpenExplainer: () => void;
  onToggleApp: (id: string, selected: boolean) => void;
  selectedIds: readonly string[];
}

export function LockedAppsScreen({ onBack, onDone, onOpenExplainer, onToggleApp, selectedIds }: LockedAppsScreenProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | string>('all');
  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sampleAppGroups
      .filter((group) => category === 'all' || group.id === category)
      .map((group) => ({
        ...group,
        apps: group.apps.filter((app) => !normalized || `${app.name} ${app.subtitle ?? ''}`.toLowerCase().includes(normalized)),
      }))
      .filter((group) => group.apps.length > 0);
  }, [category, query]);

  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader onBack={onBack} title={lockedAppsCopy.title} />
        <Intro body={lockedAppsCopy.body} label="PROTOTYPE APP PICKER" />
        <View style={styles.searchFrame}>
          <Text accessibilityElementsHidden style={styles.searchGlyph}>⌕</Text>
          <TextInput
            accessibilityLabel="Search sample apps"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={60}
            onChangeText={setQuery}
            placeholder={lockedAppsCopy.searchPlaceholder}
            placeholderTextColor={colors.text.tertiary}
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          {query ? (
            <PressableScale accessibilityLabel="Clear search" accessibilityRole="button" onPress={() => setQuery('')}>
              <View style={styles.clearButton}><Text style={styles.clearLabel}>×</Text></View>
            </PressableScale>
          ) : null}
        </View>
        <View accessibilityLabel="App categories" accessibilityRole="radiogroup" style={styles.categories}>
          {[{ id: 'all', label: 'All' }, ...sampleAppGroups].map((group) => {
            const selected = category === group.id;
            return (
              <SelectableBubble
                accessibilityLabel={group.label}
                compact
                contentStyle={styles.categorySurface}
                key={group.id}
                label={group.label}
                onPress={() => setCategory(group.id)}
                role="radio"
                selected={selected}
                style={styles.categoryItem}
              />
            );
          })}
        </View>
        <Text accessibilityLiveRegion="polite" style={s.label}>{selectedIds.length} selected</Text>
        {filteredGroups.map((group) => (
          <View key={group.id} style={s.cardGap}>
            <SectionLabel>{group.label.toUpperCase()}</SectionLabel>
            <PillowCard padding="none" variant="grouped">
              {group.apps.map((app, index) => (
                <View key={app.id}>
                  {index > 0 ? <DottedSeparator /> : null}
                  <SwitchRow onValueChange={(selected) => onToggleApp(app.id, selected)} subtitle={app.subtitle} title={app.name} value={selectedIds.includes(app.id)} />
                </View>
              ))}
            </PillowCard>
          </View>
        ))}
        {filteredGroups.length === 0 ? (
          <PillowCard>
            <Text style={s.title}>No sample apps found</Text>
            <Text style={s.body}>Try another search or category. Your staged selections are unchanged.</Text>
          </PillowCard>
        ) : null}
        <PillButton label={lockedAppsCopy.supportingLink} onPress={onOpenExplainer} variant="secondary" />
        <PillButton disabled={selectedIds.length === 0} fullWidth label="Done" onPress={onDone} variant="screen" />
        <PillButton fullWidth label="Cancel" onPress={onBack} variant="text" />
        <Text style={s.note}>No installed apps are inspected or changed.</Text>
      </ScrollView>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  categoryItem: { flexBasis: '48%', flexGrow: 1 },
  categorySurface: { width: '100%' },
  categoryLabel: { ...type.label, color: colors.text.secondary },
  categoryLabelSelected: { color: colors.text.onLight },
  categoryPill: {
    backgroundColor: colors.surface.field,
    borderRadius: radius.control,
    minHeight: layout.controlHeight,
    justifyContent: 'center',
    paddingHorizontal: space[4],
  },
  categoryPillSelected: { backgroundColor: colors.surface.light },
  clearButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  clearLabel: { ...type.navigationTitle, color: colors.text.primary },
  searchFrame: {
    alignItems: 'center',
    backgroundColor: colors.surface.card,
    borderColor: colors.surface.divider,
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: layout.controlHeight,
    paddingLeft: space[4],
  },
  searchGlyph: { ...type.navigationTitle, color: colors.text.primary },
  searchInput: { ...type.body, color: colors.text.primary, flex: 1, minHeight: layout.controlHeight, paddingHorizontal: space[3] },
});
