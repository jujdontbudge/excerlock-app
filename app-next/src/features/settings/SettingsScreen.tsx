import { Label, ScreenShell } from '../../design-system';
import { settingsCopy as c } from '../../content/settings';
import { AccountSection } from './sections/AccountSection';
import { AboutSection } from './sections/AboutSection';
import { LegalSection } from './sections/LegalSection';
import { PermissionsSection } from './sections/PermissionsSection';
import { PlanSection } from './sections/PlanSection';
import { ProfileHeader } from './sections/ProfileHeader';
import { SubscriptionSection } from './sections/SubscriptionSection';
import { SupportSection } from './sections/SupportSection';
import { Preferences } from './PreferencesPanel';

export function SettingsScreen({ navigate, onDev }: { navigate: (path: string) => void; onDev: () => void }) {
  return (
    <ScreenShell safeBottom={false} contentStyle={{ paddingHorizontal: 20, paddingTop: 4, gap: 16 }}>
      <Label accessibilityRole="header" variant="hero">
        {c.title}
      </Label>
      <ProfileHeader onPress={() => navigate('account')} />
      <SubscriptionSection />
      <PermissionsSection navigate={navigate} />
      <Preferences navigate={navigate} />
      <PlanSection navigate={navigate} />
      <SupportSection navigate={navigate} />
      <LegalSection navigate={navigate} />
      <AccountSection navigate={navigate} />
      <AboutSection onDev={onDev} />
    </ScreenShell>
  );
}
