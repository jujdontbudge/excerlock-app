import { useState } from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens as t } from '../../design-system/tokens';
import { illustrationTokens as art } from '../../design-system/illustrationTokens';
import type { Rule } from '../../domain/types';
import { TrialPhone, trialPhoneHeight, trialPhoneWidth } from '../rules/PlanTrialPreview';
import { LockedAppField } from './LockedAppField';
import { Reveal } from '../../motion/Reveal';

const hero = art.paywall;

export function PaywallHero({ rule }: { rule: Rule }) {
  const [box, setBox] = useState({ width: 0, height: 0 }),
    [conditionsEnd, setConditionsEnd] = useState<number>(hero.conditionsEnd);
  const top = t.space.sm,
    fits = (box.height - hero.fadeHeight - top) / conditionsEnd,
    phoneHeight = Math.max(0, Math.min(fits, trialPhoneHeight(box.width * hero.widest))),
    phoneWidth = trialPhoneWidth(phoneHeight),
    fadeTop = top + conditionsEnd * phoneHeight;
  return (
    <View
      testID="paywall-hero"
      onLayout={(event) => setBox(event.nativeEvent.layout)}
      style={{
        marginHorizontal: -t.layout.page,
        flex: 1,
        minHeight: hero.minHeight,
        overflow: 'hidden',
        alignItems: 'center',
      }}>
      {box.width > 0 && phoneHeight > 0 ? (
        <>
          <LockedAppField
            width={box.width}
            height={box.height}
            phone={{ left: (box.width - phoneWidth) / 2, width: phoneWidth }}
          />
          <View style={{ position: 'absolute', top }}>
            <Reveal>
              <TrialPhone
                rule={rule}
                height={phoneHeight}
                onConditionsEnd={(share) =>
                  setConditionsEnd((current) => (Math.abs(current - share) > 0.005 ? share : current))
                }
              />
            </Reveal>
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: fadeTop, bottom: 0 }}>
            <LinearGradient colors={hero.fade} style={{ height: hero.fadeHeight }} />
            <View style={{ flex: 1, backgroundColor: hero.fade[1] }} />
          </View>
        </>
      ) : null}
    </View>
  );
}
