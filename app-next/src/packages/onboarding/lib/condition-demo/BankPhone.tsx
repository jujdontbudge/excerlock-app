import { StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { tokens as t } from '../../../ui/tokens';
import { DemoState, Scenario, snapshot } from './model';
import { bankFrame, bankOffers, bankStory, boughtOffer, easeInOut, formatBank, sinceLanding } from './bankStory';
import { bankPhoneLayout, bankRows } from './layout';
import { bankPhoneStyles as styles, Feed, MiniText as Text, phoneStyles, Splash } from './Phone';
import { PointsToken } from './PointsToken';

const pulseLength = 0.24;
function offerCentre(index: number) {
  'worklet';
  return {
  x: bankPhoneLayout.bank.inset + (index % 2) * (bankPhoneLayout.grid.card + bankPhoneLayout.grid.gap) + bankPhoneLayout.grid.card / 2,
  y: bankPhoneLayout.grid.top + Math.floor(index / 2) * (bankPhoneLayout.grid.height + bankPhoneLayout.grid.gap) + bankPhoneLayout.grid.height / 2,
  };
}
const bankCentre = { x: 85, y: bankPhoneLayout.bank.top + bankPhoneLayout.bank.height / 2 };

function Offer({
  index,
  clock,
  scenario,
  points,
  activity,
}: {
  index: number;
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  points: number;
  activity: 'walking' | 'gym';
}) {
  const offer = bankOffers[index];
  const bought = index === boughtOffer;
  const press = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    const p = state.phase === 'buying' ? (state.local - bankStory.pressAt) / bankStory.press : -1;
    return { transform: [{ scale: bought && p > 0 && p < 1 ? 1 - 0.07 * Math.sin(Math.PI * p) : 1 }] };
  });
  const pickedOpacity = (state: ReturnType<typeof snapshot>) => {
    'worklet';
    const opacity =
      state.phase === 'buying'
        ? Math.min(1, Math.max(0, (state.local - bankStory.pressAt) / 0.12))
        : state.phase === 'spending' || state.phase === 'unlocked'
          ? 1
          : state.phase === 'reset'
            ? 1 - state.p
            : 0;
    return bought ? opacity : 0;
  };
  const picked = useAnimatedStyle(() => ({ opacity: pickedOpacity(snapshot(clock.value, scenario)) }));
  const unpicked = useAnimatedStyle(() => ({ opacity: 1 - pickedOpacity(snapshot(clock.value, scenario)) }));
  return (
    <Animated.View style={[styles.offer, { opacity: points >= offer.price || bought ? 1 : 0.45 }, press]}>
      <Animated.View style={[styles.offerContent, unpicked]}>
        <Text style={styles.offerTime}>{offer.label}</Text>
        <View style={styles.price}>
          <PointsToken size={12} activity={activity} />
          <Text style={styles.priceText}>{offer.price}</Text>
        </View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.offerContent, styles.offerPicked, picked]}>
        <Text style={[styles.offerTime, { color: t.text.onAccent }]}>{offer.label}</Text>
        <Text style={[styles.priceText, { color: t.text.onAccent }]}>Bought</Text>
      </Animated.View>
    </Animated.View>
  );
}

export function BankPhone({
  clock,
  scenario,
  frame,
  top,
  reduced,
}: {
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  frame: ReturnType<typeof snapshot>;
  top: number;
  reduced: boolean;
}) {
  const activity = scenario.kind === 'gym-bank' ? 'gym' : 'walking';
  const story = bankFrame(frame.phase, frame.local);
  const shop = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    if (state.phase === 'reset') return { opacity: state.p, transform: [{ translateY: 0 }] };
    if (state.phase !== 'unlocked') return { opacity: 1, transform: [{ translateY: 0 }] };
    const p = easeInOut(state.local / bankStory.lift);
    return reduced
      ? { opacity: 1 - p, transform: [{ translateY: 0 }] }
      : { opacity: 1, transform: [{ translateY: -bankRows.phoneHeight * p }] };
  });
  const splash = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    return {
      opacity: state.phase === 'unlocked' ? Math.max(0, Math.min(1, (bankStory.lift + 0.25 - state.local) / 0.15)) : 0,
    };
  });
  const pill = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    const since = sinceLanding(state.phase, state.local);
    return {
      transform: [{ scale: !reduced && since < pulseLength ? 1 + 0.14 * Math.sin((Math.PI * since) / pulseLength) : 1 }],
    };
  });
  const level = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    return { height: `${bankFrame(state.phase, state.local).fill * 100}%` };
  });
  const chip = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    const p = state.phase === 'spending' ? (state.local - bankStory.chip.start) / bankStory.chip.duration : -1;
    if (reduced || p <= 0 || p >= 1) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
    const card = offerCentre(boughtOffer);
    const from = { x: card.x, y: card.y - bankPhoneLayout.grid.height / 2 };
    const e = easeInOut(p);
    const x = from.x + (bankCentre.x - from.x) * e;
    const y = from.y + (bankCentre.y - from.y) * e - 26 * Math.sin(Math.PI * e);
    return {
      opacity: p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1,
      transform: [{ translateX: x - 24 }, { translateY: y - 12 }, { scale: 1 - 0.15 * e }],
    };
  });
  return (
    <View style={[phoneStyles.phone, { top, height: bankRows.phoneHeight }]}>
      <Feed />
      <Splash style={splash} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.shop, shop]}>
        <Animated.View style={[styles.pill, pill]}>
          <PointsToken size={18} activity={activity} />
          <Text style={styles.pillText}>{story.points}</Text>
        </Animated.View>
        <View style={styles.bank}>
          <Animated.View style={[styles.level, level]} />
          <Text style={styles.bankLabel}>Bank</Text>
          <Text style={styles.bankValue}>{formatBank(story.bankMinutes)}</Text>
        </View>
        <View style={styles.grid}>
          {bankOffers.map((offer, index) => (
            <Offer key={offer.label} {...{ index, clock, scenario, activity }} points={story.points} />
          ))}
        </View>
        <Animated.View style={[styles.chip, chip]}>
          <Text style={styles.chipText}>+3 h</Text>
        </Animated.View>
      </Animated.View>
      <Text style={[phoneStyles.time, { color: frame.phone === 'tiktok' ? t.text.onAccent : t.text.primary }]}>9:41</Text>
      <View style={[phoneStyles.home, { backgroundColor: frame.phone === 'tiktok' ? t.text.onAccent : t.text.primary }]} />
    </View>
  );
}
