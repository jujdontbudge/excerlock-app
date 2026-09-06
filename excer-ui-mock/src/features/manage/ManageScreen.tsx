import type { ComponentRef, RefObject } from 'react';
import { ImageBackground, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  firstManageFixture,
  manageRootCopy,
  showcaseManageConditionRows,
} from '@/content';
import {
  ContentFadeMask,
  DottedSeparator,
  GradientScreen,
  PillButton,
  PillowCard,
  SettingsRow,
  SwitchRow,
  colors,
  layout,
  radius,
  space,
  type,
} from '@/design-system';

import { ScreenHeader, SectionLabel, manageFeatureStyles as s } from './components';

export type ManageConditionRow = {
  banner?: ImageSourcePropType;
  enabled: boolean;
  id: string;
  name: string;
  subtitle: string;
};

export type ManageScrollHandle = ComponentRef<typeof ScrollView>;

export interface ManageScreenProps {
  conditions?: readonly ManageConditionRow[];
  lockedAppCount?: number;
  onAddCondition: () => void;
  onEditCondition: (id: string) => void;
  onMoveCondition: (id: string) => void;
  onOpenLockedApps: () => void;
  onOpenRules: () => void;
  onRemoveCondition: (id: string) => void;
  onToggleCondition: (id: string, enabled: boolean) => void;
  rulesSummary?: string;
  scrollRef?: RefObject<ManageScrollHandle | null>;
}

export function ManageScreen({
  conditions = showcaseManageConditionRows,
  lockedAppCount = firstManageFixture.lockedAppCount,
  onAddCondition,
  onEditCondition,
  onMoveCondition,
  onOpenLockedApps,
  onOpenRules,
  onRemoveCondition,
  onToggleCondition,
  rulesSummary = manageRootCopy.showcaseRulesRow.value,
  scrollRef,
}: ManageScreenProps) {
  return (
    <GradientScreen edges={['top', 'left', 'right']} variant="content">
      <ContentFadeMask>
        <ScrollView ref={scrollRef} contentContainerStyle={[s.content, styles.tabContent]} showsVerticalScrollIndicator={false}>
        <ScreenHeader action={onAddCondition} actionLabel="Add" title={manageRootCopy.title} />

        <SectionLabel>{manageRootCopy.sections.conditions}</SectionLabel>
        {conditions.length === 0 ? (
          <PillowCard>
            <View style={s.center}>
              <Text style={s.emptyTitle}>{manageRootCopy.emptyTitle}</Text>
              <Text style={[s.body, styles.centered]}>{manageRootCopy.emptyBody}</Text>
              <PillButton label={manageRootCopy.addAction} onPress={onAddCondition} variant="screen" />
            </View>
          </PillowCard>
        ) : (
          <View style={s.cardGap}>
            {conditions.map((condition) => (
              <PillowCard key={condition.id} padding="none" variant="grouped">
                {condition.banner ? (
                  <ImageBackground imageStyle={styles.bannerImage} source={condition.banner} style={styles.banner}>
                    <View style={styles.bannerScrim}><Text style={styles.bannerTitle}>{condition.name}</Text></View>
                  </ImageBackground>
                ) : null}
                <SwitchRow
                  onValueChange={(enabled) => onToggleCondition(condition.id, enabled)}
                  subtitle={condition.subtitle}
                  title="Enabled"
                  value={condition.enabled}
                />
                <DottedSeparator />
                <View style={styles.conditionActions}>
                  <PillButton label="Edit" onPress={() => onEditCondition(condition.id)} variant="text" />
                  <PillButton label="Move" onPress={() => onMoveCondition(condition.id)} variant="text" />
                  <PillButton label="Remove" onPress={() => onRemoveCondition(condition.id)} variant="text" />
                </View>
              </PillowCard>
            ))}
          </View>
        )}

        <PillowCard padding="none" variant="grouped">
          <SettingsRow
            onPress={onOpenLockedApps}
            subtitle="Prototype picker · no installed apps are inspected"
            title={manageRootCopy.lockedAppsRow.label}
            value={`${lockedAppCount} selected`}
          />
        </PillowCard>

        <PillowCard padding="none" variant="grouped">
          <SettingsRow onPress={onOpenRules} subtitle={rulesSummary} title={manageRootCopy.naturalRulesRow.label} />
        </PillowCard>
        </ScrollView>
      </ContentFadeMask>
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  banner: { height: 92, justifyContent: 'flex-end' },
  bannerImage: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  bannerScrim: { backgroundColor: colors.surface.mediaScrim, padding: space[3] },
  bannerTitle: { ...type.cardTitle, color: colors.text.primary },
  centered: { maxWidth: 280, textAlign: 'center' },
  conditionActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', paddingHorizontal: space[2] },
  tabContent: { paddingBottom: layout.tabBarContentInset },
});
