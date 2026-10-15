import { StyleSheet, View } from 'react-native';
import Animated, { SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { tokens as t } from '../../../ui/tokens';
import { DemoState, Scenario, snapshot } from './model';
import {
  bankFrame,
  bankOffers,
  bankPhases,
  bankStory,
  boughtOffer,
  easeInOut,
  formatBank,
  sinceLanding,
  sinceStreamLanding,
  streamDepart,
  streamLanded,
} from './bankStory';
import { bankChipGlyph, bankPhoneLayout, bankRows } from './layout';
import { bankPhoneStyles as styles, Feed, MiniText as Text, phoneStyles, Splash } from './Phone';
import { PointsToken } from '../../../ui/PointsToken';

type Frame = ReturnType<typeof snapshot>;
const grid = bankPhoneLayout.grid;
const streamToken = 16;
const number = (value: number) => value.toLocaleString('en-US');
const spendingTail = (bankPhases.find((phase) => phase.name === 'spending')?.duration ?? 0) - streamLanded;

function offerCentre(index: number) {
  'worklet';
  return {
    x: grid.inset + (index % 2) * (grid.card + grid.gap) + grid.card / 2,
    y: grid.top + Math.floor(index / 2) * (grid.height + grid.gap) + grid.height / 2,
  };
}

function jitter(index: number, salt: number) {
  'worklet';
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function confirming(state: Frame) {
  'worklet';
  return state.phase === 'buying' && state.local >= bankStory.pressAt && state.local < bankStory.confirmAt + bankStory.press / 2;
}

function Offer({
  index,
  clock,
  scenario,
  frame,
  activity,
}: {
  index: number;
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  frame: Frame;
  activity: 'walking' | 'gym';
}) {
  const offer = bankOffers[index];
  const bought = index === boughtOffer;
  const points = bankFrame(frame.phase, frame.local).points;
  const press = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    const tap = (at: number) => {
      const p = state.phase === 'buying' ? (state.local - at) / bankStory.press : -1;
      return p > 0 && p < 1 ? 0.07 * Math.sin(Math.PI * p) : 0;
    };
    return { transform: [{ scale: bought ? 1 - tap(bankStory.pressAt) - tap(bankStory.confirmAt) : 1 }] };
  });
  const picked = useAnimatedStyle(() => ({ opacity: bought && confirming(snapshot(clock.value, scenario)) ? 1 : 0 }));
  return (
    <Animated.View style={[styles.offer, press]}>
      <View style={[styles.offerContent, { opacity: points >= offer.price || frame.phase === 'buying' ? 1 : 0.45 }]}>
        <Text style={styles.offerTime}>{offer.label}</Text>
        <View style={styles.price}>
          <PointsToken size={12} activity={activity} />
          <Text style={styles.priceText}>{number(offer.price)}</Text>
        </View>
      </View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.offerContent, styles.offerPicked, picked]}>
        <Text style={[styles.offerTime, { color: t.text.onAccent }]}>{offer.label}</Text>
        <View style={styles.price}>
          <Text style={[styles.priceText, { color: t.text.onAccent }]}>Buy ·</Text>
          <PointsToken size={12} activity={activity} tone="onAccent" />
          <Text style={[styles.priceText, { color: t.text.onAccent }]}>{number(offer.price)}</Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function StreamToken({
  index,
  clock,
  scenario,
  activity,
}: {
  index: number;
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  activity: 'walking' | 'gym';
}) {
  const style = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    const local = state.phase === 'spending' ? state.local : -1;
    const depart = streamDepart(index);
    const { spill, flight } = bankStory.stream;
    if (local < 0 || local > depart + flight) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 0 }] };
    const from = offerCentre(boughtOffer);
    const angle = index * 2.39996;
    const radius = bankPhoneLayout.stream.reach * (0.35 + 0.65 * jitter(index, 2));
    const start = { x: from.x + Math.cos(angle) * radius, y: from.y + Math.sin(angle) * radius * 0.75 };
    const out = Math.min(1, local / spill);
    const spilled = 1 - (1 - out) * (1 - out) * (1 - out);
    const a = { x: from.x + (start.x - from.x) * spilled, y: from.y + (start.y - from.y) * spilled };
    const e = easeInOut((local - depart) / flight);
    const to = bankChipGlyph;
    const dx = to.x - start.x,
      dy = to.y - start.y,
      distance = Math.hypot(dx, dy);
    const bow = distance * 0.2 * (0.35 + 0.9 * jitter(index, 3));
    const bend = { x: (start.x + to.x) / 2 + (dy / distance) * bow, y: (start.y + to.y) / 2 - (dx / distance) * bow };
    const u = 1 - e;
    const x = u * u * a.x + 2 * u * e * bend.x + e * e * to.x;
    const y = u * u * a.y + 2 * u * e * bend.y + e * e * to.y;
    const grow = 0.8 + 0.4 * jitter(index, 5);
    return {
      opacity: e > 0.92 ? (1 - e) / 0.08 : Math.min(1, out * 4),
      transform: [
        { translateX: x - streamToken / 2 },
        { translateY: y - streamToken / 2 },
        { scale: grow * (0.3 + 0.7 * out) * (1 - 0.4 * Math.max(0, (e - 0.8) / 0.2)) },
      ],
    };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, style]}>
      <PointsToken size={streamToken} activity={activity} />
    </Animated.View>
  );
}

function BankChip({ clock, scenario, frame, reduced }: { clock: SharedValue<DemoState>; scenario: Scenario; frame: Frame; reduced: boolean }) {
  const minutes = bankFrame(frame.phase, frame.local).bankMinutes;
  const chip = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    const since = sinceStreamLanding(state.phase, state.local);
    const final = state.phase === 'spending' ? state.local - streamLanded : -1;
    const grow = final >= 0 && final < 0.3 ? 0.18 * Math.sin((Math.PI * final) / 0.3) : 0;
    const pulse = since < bankStory.pulse ? 0.08 * Math.sin((Math.PI * since) / bankStory.pulse) : 0;
    return { transform: [{ scale: reduced ? 1 : 1 + Math.max(grow, pulse) }] };
  });
  const hand = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    const p = state.phase === 'spending' ? Math.max(0, (state.local - streamLanded) / 0.5) : state.phase === 'unlocked' ? 1 : 0;
    return { transform: [{ rotate: `${360 * (1 - Math.pow(1 - Math.min(1, p), 3))}deg` }] };
  });
  const gain = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    const local = state.phase === 'spending' ? state.local - streamLanded : state.phase === 'unlocked' ? state.local + spendingTail : -1;
    if (reduced || local < 0) return { opacity: 0, transform: [{ translateY: 0 }, { scale: 0.5 }] };
    const p = Math.min(1, local / bankStory.gain);
    const spring = 1 - Math.pow(1 - p, 3) * Math.cos(p * Math.PI * 1.5);
    return { opacity: Math.min(1, p * 3), transform: [{ translateY: -bankPhoneLayout.header.height + (bankPhoneLayout.header.height + 4) * spring }, { scale: 0.5 + 0.5 * spring }] };
  });
  const { glyph } = bankPhoneLayout.chip;
  return (
    <View style={styles.chipSlot}>
      <Animated.View style={[styles.gain, gain]}>
        <Text style={styles.gainText}>+3 h</Text>
      </Animated.View>
      <Animated.View style={[styles.bankChip, chip]}>
        <View style={[styles.glyph, { width: glyph, height: glyph }]}>
          <View style={styles.hourHand} />
          <Animated.View style={[StyleSheet.absoluteFill, hand]}>
            <View style={styles.minuteHand} />
          </Animated.View>
        </View>
        <Text style={styles.chipValue}>{formatBank(minutes)}</Text>
      </Animated.View>
    </View>
  );
}

export function BankPhone({
  clock,
  scenario,
  frame,
  top,
  height,
  reduced,
}: {
  clock: SharedValue<DemoState>;
  scenario: Scenario;
  frame: Frame;
  top: number;
  height: number;
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
      : { opacity: 1, transform: [{ translateY: -height * p }] };
  });
  const splash = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    return {
      opacity: state.phase === 'unlocked' ? Math.max(0, Math.min(1, (bankStory.lift + 0.25 - state.local) / 0.15)) : 0,
    };
  });
  const hero = useAnimatedStyle(() => {
    const state = snapshot(clock.value, scenario);
    const since = sinceLanding(state.phase, state.local);
    return {
      transform: [{ scale: !reduced && since < bankStory.pulse ? 1 + 0.12 * Math.sin((Math.PI * since) / bankStory.pulse) : 1 }],
    };
  });
  return (
    <View style={[phoneStyles.phone, { top, height }]}>
      <Feed />
      <Splash style={splash} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.shop, shop]}>
        <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: bankRows.phoneHeight }}>
          <View style={styles.header}>
            <Text style={styles.title}>Shop</Text>
          </View>
          <BankChip {...{ clock, scenario, frame, reduced }} />
          <Animated.View style={[styles.hero, hero]}>
            <PointsToken size={bankPhoneLayout.hero.token} activity={activity} />
            <View style={styles.heroNumber}>
              <Text style={styles.heroText}>{number(story.points)}</Text>
            </View>
          </Animated.View>
          <Text style={styles.heroCaption}>Points</Text>
          <View style={styles.grid}>
            {bankOffers.map((offer, index) => (
              <Offer key={offer.label} {...{ index, clock, scenario, frame, activity }} />
            ))}
          </View>
          {reduced
            ? null
            : Array.from({ length: bankPhoneLayout.stream.count }, (_, index) => (
                <StreamToken key={index} {...{ index, clock, scenario, activity }} />
              ))}
        </View>
      </Animated.View>
      <Text style={[phoneStyles.time, { color: frame.phone === 'tiktok' ? t.text.onAccent : t.text.primary }]}>9:41</Text>
      <View style={[phoneStyles.home, { backgroundColor: frame.phone === 'tiktok' ? t.text.onAccent : t.text.primary }]} />
    </View>
  );
}
