import { View } from 'react-native';
import { Redirect, useIsFocused } from 'expo-router';
import { ScreenShell, Label } from '../ui';
import { BankChip } from '../ui/BankChip';
import { OfferCard } from '../ui/OfferCard';
import { PointsPill } from '../ui/PointsPill';
import { tokens as t } from '../ui/tokens';
import { useBank, buyOffer, activityToGo } from '../bank/Bank';
import { shopCopy as c } from './shopCopy';
export function ShopScreen() {
  const bank = useBank();
  const focused = useIsFocused();
  if (!bank) return focused ? <Redirect href="/home" /> : null;
  const rows = [bank.offers.slice(0, 2), bank.offers.slice(2)];
  return (
    <ScreenShell dock safeBottom={false} scrollUnderStatusBar={false}>
      <View style={{ justifyContent: 'center', zIndex: 1 }}>
        <Label variant="display" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {c.title}
        </Label>
        <View style={{ position: 'absolute', right: 0 }}>
          <BankChip minutes={bank.bankMinutes} />
        </View>
      </View>
      <View style={{ paddingVertical: t.space.lg, alignItems: 'center', gap: t.space.xs }}>
        <PointsPill activity={bank.activity} points={bank.points} size="hero" target="shop-points" spentBy="shop-bank" />
        <Label variant="support" tone="secondary">
          {c.points}
        </Label>
      </View>
      <View style={{ gap: t.space.md }}>
        {rows.map((row) => (
          <View key={row[0].id} style={{ flexDirection: 'row', gap: t.space.md }}>
            {row.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                activity={bank.activity}
                points={bank.points}
                toGo={activityToGo(bank, offer)}
                bankEmpty={bank.bankMinutes <= 0}
                onBuy={() => buyOffer(offer.id)}
              />
            ))}
          </View>
        ))}
      </View>
    </ScreenShell>
  );
}
