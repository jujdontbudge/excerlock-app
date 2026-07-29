import { ScrollView, Text, View } from "react-native";

import { AccountSettingsCard } from "@/account";
import {
  NotificationSettingsCard,
  type NotificationModule,
} from "@/notifications";
import { SupportSettingsCard, type SupportModule } from "@/support";
import { Card, Screen, SectionHeader, useTheme } from "@/ui";

import { GracePeriodPicker } from "../components/GracePeriodPicker";
import { SettingsRow } from "../components/SettingsRow";
import { useSettingsStore } from "../store/settingsStore";

export type SettingsScreenProps = Readonly<{
  notificationModule?: NotificationModule;
  openNotificationSettings?: () => void;
  supportModule?: SupportModule;
}>;

/** Settings surface: real local choices plus owned integration boundaries. */
export function SettingsScreen({
  notificationModule,
  openNotificationSettings,
  supportModule,
}: SettingsScreenProps = {}) {
  const { spacing, typography } = useTheme();
  const gracePeriod = useSettingsStore(
    (state) => state.walkAndScrollGracePeriodSeconds,
  );
  const setGracePeriod = useSettingsStore(
    (state) => state.setWalkAndScrollGracePeriod,
  );

  return (
    <Screen testID="settings-screen">
      <ScrollView
        contentContainerStyle={{
          gap: spacing.xl,
          paddingBottom: spacing.xxl * 2,
          paddingHorizontal: spacing.gutter,
          paddingTop: spacing.gutter,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text accessibilityRole="header" style={typography.screenTitle}>
          Settings
        </Text>

        <View style={{ gap: spacing.md }}>
          <SectionHeader
            title="Walk & Scroll"
            subtitle="Choose the pause that feels fair. Detection constants stay fixed."
          />
          <Card style={{ gap: spacing.lg }}>
            <GracePeriodPicker value={gracePeriod} onChange={setGracePeriod} />
            <SettingsRow
              title="Walking cadence"
              value="Around 60–70 steps/min"
              description="Fixed to keep walking detection trustworthy."
            />
            <SettingsRow
              title="Unlock increment"
              value="15 minutes"
              description="Fixed to Apple's minimum monitoring interval."
            />
          </Card>
        </View>

        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Account" />
          <AccountSettingsCard />
        </View>

        <View style={{ gap: spacing.md }}>
          <SectionHeader
            title="Notifications"
            subtitle="Every type starts off. Turn on only what helps."
          />
          <NotificationSettingsCard
            module={notificationModule}
            openSettings={openNotificationSettings}
          />
        </View>

        <View style={{ gap: spacing.md }}>
          <SectionHeader title="Support & Feedback" />
          <SupportSettingsCard module={supportModule} />
        </View>

        {__DEV__ ? (
          <View style={{ gap: spacing.md }}>
            <SectionHeader title="Development" />
            <Card>
              <SettingsRow
                title="Debug menu"
                description="Fixtures and diagnostics for development builds."
              />
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
