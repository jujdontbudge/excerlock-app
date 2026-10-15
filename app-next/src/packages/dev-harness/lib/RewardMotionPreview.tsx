import { ReactNode, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Label, PressableScale, SegmentedControl } from '../../ui';
import { BankHero } from '../../ui/BankHero';
import { CollectChip } from '../../ui/CollectChip';
import { DifficultyCards } from '../../ui/DifficultyCards';
import { FlyToTargetProvider, useFlyTarget, useLandingValue } from '../../ui/FlyToTarget';
import { Icon } from '../../ui/Icon';
import { OfferCard } from '../../ui/OfferCard';
import { PointsPill } from '../../ui/PointsPill';
import { PointsToken } from '../../ui/PointsToken';
import { RollingNumber } from '../../ui/RollingNumber';
import { formatBank, type PointsActivity } from '../../ui/rewardsCopy';
import { tokens as t } from '../../ui/tokens';
import { economy, offers } from '../../model/bankEconomy';
import { previewBankProgress, previewDifficulties as difficulties } from './previewsCopy';

const sections = ['Token', 'Home', 'Shop', 'Difficulty'] as const;
type Section = (typeof sections)[number];

function DevButton({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <PressableScale
      label={title}
      haptic="none"
      onPress={onPress}
      style={{
        height: t.control.inline,
        paddingHorizontal: t.space.lg,
        borderRadius: t.radius.pill,
        backgroundColor: t.surface.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Label variant="support">{title}</Label>
    </PressableScale>
  );
}

function Controls({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: t.space.sm }}>{children}</View>;
}

function Caption({ children }: { children: string }) {
  return (
    <Label variant="label" style={{ textAlign: 'center' }}>
      {children}
    </Label>
  );
}

function TokenSheet({ activity }: { activity: PointsActivity }) {
  const sizes = [t.icon.sm, t.points.pill, t.points.flight, t.points.hero, t.layout.ring - t.space.xxl];
  const row = (background: string, tone: 'accent' | 'onAccent') => (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        padding: t.space.lg,
        borderRadius: t.radius.card,
        backgroundColor: background,
      }}>
      {sizes.map((size) => (
        <PointsToken key={size} activity={activity} size={size} tone={tone} />
      ))}
    </View>
  );
  return (
    <View style={{ gap: t.space.md }}>
      {row(t.surface.warmCanvas, 'accent')}
      {row(t.surface.softChoice, 'accent')}
      {row(t.brand.primary, 'onAccent')}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: t.space.lg }}>
        <Icon name={activity} size={t.icon.md} />
        <Icon name="flame" size={t.icon.md} />
        <PointsToken activity={activity} size={t.icon.md} />
        <Icon name="lock" size={t.icon.md} />
        <Icon name="clock" size={t.icon.md} />
      </View>
    </View>
  );
}

function RollingSheet() {
  const [value, setValue] = useState(1000);
  return (
    <View style={{ gap: t.space.md, alignItems: 'center' }}>
      <RollingNumber value={value} />
      <Controls>
        {[1, 37, 120, -250, 1000].map((delta) => (
          <DevButton key={delta} title={delta > 0 ? `+${delta}` : `${delta}`} onPress={() => setValue((v) => Math.max(0, v + delta))} />
        ))}
      </Controls>
    </View>
  );
}

function HomeSheet({ activity }: { activity: PointsActivity }) {
  const [points, setPoints] = useState(340);
  const [pending, setPending] = useState(120);
  const [bank, setBank] = useState(192);
  const [collected, setCollected] = useState(false);
  return (
    <View style={{ gap: t.space.lg }}>
      <BankHero minutes={bank} />
      <PointsPill activity={activity} points={points} onPress={() => undefined} />
      <View style={{ minHeight: t.points.chip + t.space.sm, justifyContent: 'center' }}>
        {pending > 0 ? (
          <CollectChip
            key={pending}
            activity={activity}
            amount={pending}
            first={!collected}
            onCollect={() => {
              setPoints((value) => value + pending);
              setPending(0);
              setCollected(true);
            }}
          />
        ) : null}
      </View>
      <Label tone="secondary" style={{ textAlign: 'center' }}>
        {previewBankProgress(activity)}
      </Label>
      <Controls>
        <DevButton title="Points waiting +120" onPress={() => setPending((value) => value + 120)} />
        <DevButton title="Waiting +460" onPress={() => setPending((value) => value + 460)} />
        <DevButton title="First collect again" onPress={() => setCollected(false)} />
        <DevButton title="Bank +3 h" onPress={() => setBank((value) => value + 180)} />
        <DevButton title="Drain 45 m" onPress={() => setBank((value) => Math.max(0, value - 45))} />
        <DevButton title="Empty Bank" onPress={() => setBank(0)} />
      </Controls>
      <RollingSheet />
    </View>
  );
}

function ShopSheet({ activity, onBought }: { activity: PointsActivity; onBought: (minutes: number) => void }) {
  const [points, setPoints] = useState(340);
  const [bankEmpty, setBankEmpty] = useState(false);
  const toGo = (price: number) =>
    activity === 'gym'
      ? (price - points) / economy.medium.pointsPerGymMinute
      : (price - points) * economy.medium.stepsPerPoint;
  return (
    <View style={{ gap: t.space.xl }}>
      <PointsPill activity={activity} points={points} size="hero" target="shop-points" />
      <View style={{ gap: t.space.md }}>
        {[offers.slice(0, 2), offers.slice(2)].map((pair, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: t.space.md }}>
            {pair.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                activity={activity}
                points={points}
                toGo={toGo(offer.price)}
                bankEmpty={bankEmpty}
                onBuy={() => {
                  if (points < offer.price) return 'insufficient';
                  setPoints((value) => value - offer.price);
                  setBankEmpty(false);
                  onBought(offer.minutes);
                  return 'bought';
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <Controls>
        <DevButton title="Rich 1,200" onPress={() => setPoints(1200)} />
        <DevButton title="Some 340" onPress={() => setPoints(340)} />
        <DevButton title="Broke 12" onPress={() => setPoints(12)} />
        <DevButton title={bankEmpty ? 'Bank is empty' : 'Make Bank empty'} onPress={() => setBankEmpty(true)} />
      </Controls>
    </View>
  );
}

function MockTabBar({ bank }: { bank: number }) {
  const insets = useSafeAreaInsets();
  const { ref: homeRef, style: homeStyle } = useFlyTarget('home');
  const shown = useLandingValue('home', bank);
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: insets.bottom,
        paddingTop: t.space.sm,
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: t.surface.warmCanvas,
      }}>
      <Animated.View ref={homeRef} collapsable={false} style={[{ alignItems: 'center' }, homeStyle]}>
        <Icon name="house" size={t.icon.md} />
        <Label variant="micro">{formatBank(shown)}</Label>
      </Animated.View>
      {(['token-walking', 'list', 'chart', 'gear'] as const).map((name) => (
        <View key={name} style={{ alignItems: 'center' }}>
          <Icon name={name} size={t.icon.md} tone="muted" />
          <Label variant="micro" tone="secondary">
            {' '}
          </Label>
        </View>
      ))}
    </View>
  );
}

export function RewardMotionPreview() {
  const insets = useSafeAreaInsets();
  const [section, setSection] = useState<Section>('Home');
  const [activity, setActivity] = useState<PointsActivity>('walking');
  const [difficulty, setDifficulty] = useState<(typeof difficulties)[number]['id']>('medium');
  const [bank, setBank] = useState(192);
  return (
    <FlyToTargetProvider>
      <View style={{ flex: 1, backgroundColor: t.surface.warmCanvas }}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + t.space.sm,
            paddingBottom: insets.bottom + t.layout.header * 2,
            paddingHorizontal: t.layout.page,
            gap: t.space.xl,
          }}>
          <SegmentedControl options={sections} value={section} onChange={(value) => setSection(value as Section)} />
          <SegmentedControl options={['walking', 'gym']} value={activity} onChange={(value) => setActivity(value as PointsActivity)} />
          {section === 'Token' ? <TokenSheet activity={activity} /> : null}
          {section === 'Home' ? <HomeSheet key={activity} activity={activity} /> : null}
          {section === 'Shop' ? (
            <ShopSheet key={activity} activity={activity} onBought={(minutes) => setBank((value) => value + minutes)} />
          ) : null}
          {section === 'Difficulty' ? (
            <View style={{ gap: t.space.lg }}>
              <Caption>How hard should screen time be to earn?</Caption>
              <DifficultyCards options={difficulties} value={difficulty} onChange={setDifficulty} />
            </View>
          ) : null}
        </ScrollView>
        {section === 'Shop' ? <MockTabBar bank={bank} /> : null}
      </View>
    </FlyToTargetProvider>
  );
}
