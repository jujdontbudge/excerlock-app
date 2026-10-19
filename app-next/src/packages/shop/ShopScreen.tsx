import { View } from 'react-native';
import { Redirect, useIsFocused } from 'expo-router';
import { BrandMark, ScreenShell, Label } from '../ui';
import { useShowcaseMode } from '../progress/showcaseModeStore';
import { BankHero } from '../ui/BankHero';
import { OfferCard } from '../ui/OfferCard';
import { PointsPill } from '../ui/PointsPill';
import { tokens as t } from '../ui/tokens';
import { useBank, buyOffer, activityToGo } from '../bank/Bank';
import { shopCopy as c } from './shopCopy';
export function ShopScreen() {
  const bank = useBank();
  const focused = useIsFocused();
  const showcase = useShowcaseMode();
  if (!bank) return focused ? <Redirect href="/home" /> : null;
  const rows = [bank.offers.slice(0, 2), bank.offers.slice(2)];
  return (
    <ScreenShell dock safeBottom={false} scrollUnderStatusBar={false}>
      {showcase ? (
        <BrandMark name={c.appName} />
      ) : (
        <Label variant="display" accessibilityRole="header" style={{ textAlign: 'center' }}>
          {c.title}
        </Label>
      )}
      <View style={{ flexGrow: 1, justifyContent: 'center', gap: t.space.xl }}>
        <View style={{ alignItems: 'center', gap: t.space.xs }}>
          <PointsPill activity={bank.activity} points={bank.points} size="hero" target="shop-points" spentBy="shop-bank" />
          <Label variant="support" tone="secondary">
            {c.points}
          </Label>
        </View>
        <BankHero minutes={bank.bankMinutes} target="shop-bank" compact />
        {showcase ? <BrandMark name={c.appName} /> : null}
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
      </View>
    </ScreenShell>
  );
}
