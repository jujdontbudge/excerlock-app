import { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useIsFocused } from 'expo-router';
import { ScreenShell, Heading, Label, SecondaryButton } from '../ui';
import { tokens as t } from '../ui/tokens';
import { useBank, offers, buyOffer, activityToGo, type OfferId } from '../bank/Bank';
import { bankTime } from '../bank/bankCopy';
import { shopCopy as c } from './shopCopy';
import { haptic } from '../ui/haptics';
export function ShopScreen() {
  const bank = useBank();
  const focused = useIsFocused();
  const [confirming, setConfirming] = useState<OfferId | null>(null);
  if (!bank) return focused ? <Redirect href="/home" /> : null;
  return (
    <ScreenShell dock safeBottom={false}>
      <Heading title={c.title} centered />
      <Label variant="metric" style={{ textAlign: 'center' }}>
        {bank.points.toLocaleString('en-US')}
      </Label>
      <Label style={{ textAlign: 'center' }}>{c.points}</Label>
      <View style={{ gap: t.space.md, flexDirection: 'row', flexWrap: 'wrap' }}>
        {offers.map((offer) => {
          const affordable = bank.points >= offer.price;
          return (
            <View
              key={offer.id}
              style={{
                flexBasis: '45%',
                flexGrow: 1,
                gap: t.space.sm,
                padding: t.space.lg,
                borderRadius: t.radius.card,
                backgroundColor: t.surface.softChoice,
              }}>
              <SecondaryButton
                label={
                  confirming === offer.id && affordable
                    ? c.confirm(offer.price)
                    : c.offer(bankTime(offer.minutes), offer.price)
                }
                onPress={() => {
                  if (!affordable) {
                    haptic('warning');
                    return;
                  }
                  if (confirming !== offer.id) {
                    setConfirming(offer.id);
                    return;
                  }
                  const wasEmpty = bank.bankMinutes === 0;
                  if (buyOffer(offer.id) === 'bought') haptic(wasEmpty ? 'unlock' : 'success');
                  setConfirming(null);
                }}
              />
              {!affordable ? (
                <Label tone="secondary" style={{ textAlign: 'center' }}>
                  {c.toGo(activityToGo(bank, offer), bank.activity)}
                </Label>
              ) : null}
            </View>
          );
        })}
      </View>
    </ScreenShell>
  );
}
