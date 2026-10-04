import { useState } from 'react';
import { Image, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Label } from '../ui/Label';
import { BackButton } from '../ui/BackButton';
import { SettingsRow } from '../ui/SettingsRow';
import { SecondaryButton } from '../ui/SecondaryButton';
import { SetupPresentation } from '../ui/SetupPresentation';
import { TabBar } from '../ui/TabBar';
import { tokens as t } from '../ui/tokens';
import { illustrationTokens as art } from '../ui/illustrationTokens';
import { homeCopy } from '../home/homeCopy';
import { planCopy as c } from '../conditions/planCopy';
import { Rule } from '../model/types';
import { scheduleLabel } from '../schedule/scheduleLabel';
import { ruleName } from '../conditions/ruleName';
import { HomeConditionCard } from '../home/HomeConditionCard';
import { HomeLockStatus } from '../home/HomeLockStatus';
import { progressContent } from '../home/progressContent';
import { UnlockEntry } from '../unlock/UnlockEntry';
import { inactiveWalkingStatus } from '../ports/WalkingPort';

const frame = { source: require('../../../assets/phone-frame.png'), width: 703, height: 1442 } as const;
const hole = { left: 35, top: 29, width: 632, height: 1383, radius: 112 } as const;
const bodyRadius = 130;
const device = { width: 402, height: (402 * hole.height) / hole.width, insets: { top: 62, bottom: 34, left: 0, right: 0 } } as const;
const statusBar = { centre: 31, time: 68, icons: 334 } as const;
const granted = { screenTime: 'granted', motion: 'granted', location: 'whenInUse', camera: 'granted', notifications: 'granted' } as const;

export function PlanTrialPreview({ rule, onBack }: { rule: Rule; onBack: () => void }) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  const height = Math.min(box.height, (box.width * 0.68 * frame.height) / frame.width);
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: t.space.lg }}>
      <View style={{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start' }}>
        <BackButton onPress={onBack} />
        <Label accessibilityRole="header" variant="display" style={{ flex: 1, textAlign: 'center' }}>
          {c.trialTitle}
        </Label>
        <View style={{ width: t.icon.md }} />
      </View>
      <View
        testID="trial-phone-box"
        style={{ flex: 1, alignSelf: 'stretch', alignItems: 'center' }}
        onLayout={(event) => setBox(event.nativeEvent.layout)}>
        {height > 0 ? <TrialPhone rule={rule} height={height} /> : null}
      </View>
    </View>
  );
}

export const trialPhoneWidth = (height: number) => (height * frame.width) / frame.height;
export const trialPhoneHeight = (width: number) => (width * frame.height) / frame.width;

export function TrialPhone({ rule, height, onConditionsEnd }: {
  rule: Rule;
  height: number;
  onConditionsEnd?: (share: number) => void;
}) {
  const scale = height / frame.height;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`${c.trialPreview}: ${ruleName(rule)}`}
      style={{ width: frame.width * scale, height }}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: bodyRadius * scale, boxShadow: art.demo.shadow }} />
      <View style={{
        position: 'absolute',
        left: hole.left * scale,
        top: hole.top * scale,
        width: hole.width * scale,
        height: hole.height * scale,
        borderRadius: hole.radius * scale,
        overflow: 'hidden',
      }}>
        <HomePreview rule={rule} scale={(hole.width * scale) / device.width}
          onConditionsEnd={onConditionsEnd
            ? (bottom) => onConditionsEnd((hole.top + (bottom * hole.width) / device.width) / frame.height)
            : undefined} />
      </View>
      <Image testID="trial-phone-frame" source={frame.source} resizeMode="stretch" fadeDuration={0}
        style={{ position: 'absolute', width: '100%', height: '100%' }} />
    </View>
  );
}

function HomePreview({ rule, scale, onConditionsEnd }: {
  rule: Rule;
  scale: number;
  onConditionsEnd?: (bottom: number) => void;
}) {
  const model = progressContent(rule, { ruleId: rule.id, day: '', progress: 0, met: false, metAt: null }, granted,
    inactiveWalkingStatus, false);
  return (
    <SetupPresentation enabled={false}>
      <SafeAreaInsetsContext.Provider value={device.insets}>
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ width: device.width, height: device.height, transformOrigin: 'top left', transform: [{ scale }] }}>
          <LinearGradient colors={t.surface.orangeGradient} locations={[0, 0.35, 1]}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <StatusBar />
          <View style={{ paddingTop: device.insets.top, paddingHorizontal: t.layout.page, gap: t.space.xl }}>
            <View style={{ paddingTop: t.layout.page }}>
              <Label variant="display" style={{ textAlign: 'center' }}>{homeCopy.title}</Label>
            </View>
            <HomeLockStatus unlocked={false} />
            <View style={{ gap: t.space.md }}
              onLayout={(event) => onConditionsEnd?.(event.nativeEvent.layout.y + event.nativeEvent.layout.height)}>
              <HomeConditionCard icon={model.icon} title={model.title} schedule={scheduleLabel(rule.schedule)}
                detail={model.detail} progress={rule.mode.kind === 'state' ? null : { value: model.value, tone: 'brand' }}>
                {model.action === 'walk' ? (
                  <UnlockEntry kind="walking" label={homeCopy.walkingEntry} onPress={() => undefined} />
                ) : rule.activity === 'gym' ? (
                  <UnlockEntry kind="gym" label={homeCopy.gymEntry} onPress={() => undefined} inverted />
                ) : 'label' in model && model.label ? (
                  <SecondaryButton label={model.label} onPress={() => undefined} />
                ) : null}
              </HomeConditionCard>
            </View>
            <View style={{ backgroundColor: t.surface.card, borderRadius: t.radius.pill,
              borderWidth: t.stroke.hairline, borderColor: t.border.outline }}>
              <SettingsRow title={homeCopy.lockedApps} icon="lock" onPress={() => undefined} />
            </View>
          </View>
          <TabBar selected="home" onSelect={() => undefined} />
        </View>
      </SafeAreaInsetsContext.Provider>
    </SetupPresentation>
  );
}

function StatusBar() {
  const row = { position: 'absolute', top: statusBar.centre - 11, height: 22, flexDirection: 'row', alignItems: 'center' } as const;
  return (
    <>
      <View style={[row, { left: statusBar.time - 40, width: 80, justifyContent: 'center' }]}>
        <Text allowFontScaling={false} style={{ ...art.miniature.statusBar, color: t.text.primary }}>9:41</Text>
      </View>
      <View style={[row, { left: statusBar.icons - 40, width: 80, justifyContent: 'center', gap: 6 }]}>
        <SymbolView name="cellularbars" size={19} weight="semibold" tintColor={t.text.primary} />
        <SymbolView name="wifi" size={18} weight="semibold" tintColor={t.text.primary} />
        <SymbolView name="battery.100percent" size={30} tintColor={t.text.primary} />
      </View>
    </>
  );
}
