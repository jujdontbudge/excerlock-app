import {
  createContext,
  PropsWithChildren,
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Confetti } from './Confetti';
import { haptic, HapticIntent } from './haptics';
import { tokens as t } from './tokens';
import { useMotion } from './useMotion';

type Point = { x: number; y: number };
export type Box = Point & { width: number; height: number };
export type FlightProgress = { landed: number; count: number; launched: boolean };
export type FlightSource = RefObject<View | null> | Box;
export type FlightOptions = {
  from: FlightSource;
  to: string;
  token: (index: number) => ReactNode;
  count?: number;
  size?: number;
  delay?: number;
  haptic?: HapticIntent;
  spread?: 'fan' | 'burst';
  celebrate?: boolean;
  onLand?: (landed: number, count: number) => void;
};
type Flight = {
  key: number;
  from: Point;
  to: Point;
  count: number;
  size: number;
  delay: number;
  spread: 'fan' | 'burst';
  reach: number;
  token: (index: number) => ReactNode;
  land: () => void;
};
type Target = {
  ref: RefObject<View | null>;
  anchor: RefObject<View | null>;
  pulse: () => void;
  settle: () => void;
};
type Context = {
  register: (id: string, target: Target) => () => void;
  fly: (options: FlightOptions) => Promise<void>;
  progress: (id: string) => FlightProgress | null;
  subscribe: (listener: () => void) => () => void;
};

const FlyContext = createContext<Context | null>(null);
const travel = Easing.bezierFn(...t.motion.easing.travel);
const r = t.motion.reward;

export const measureBox = (source: FlightSource) =>
  new Promise<Box | null>((resolve) => {
    if (!('current' in source)) return resolve(source);
    const node = source.current;
    if (!node) return resolve(null);
    node.measureInWindow((x, y, width, height) => resolve(width || height ? { x, y, width, height } : null));
  });
const centre = (box: Box, origin: Box): Point => ({
  x: box.x - origin.x + box.width / 2,
  y: box.y - origin.y + box.height / 2,
});
const flightCount = (count: number | undefined) => Math.max(1, Math.round(count ?? 1));

export function FlyToTargetProvider({ children }: PropsWithChildren) {
  const m = useMotion();
  const { width } = useWindowDimensions();
  const layer = useRef<View>(null);
  const targets = useRef(new Map<string, Target>());
  const progress = useRef(new Map<string, FlightProgress>());
  const listeners = useRef(new Set<() => void>());
  const keys = useRef(0);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bursts, setBursts] = useState<{ key: number; at: Point }[]>([]);

  const publish = useCallback((id: string, value: FlightProgress | null) => {
    if (value) progress.current.set(id, value);
    else progress.current.delete(id);
    listeners.current.forEach((listener) => listener());
  }, []);

  const fly = useCallback(
    async (options: FlightOptions) => {
      const count = flightCount(options.count);
      const target = targets.current.get(options.to);
      publish(options.to, { landed: 0, count, launched: false });
      const finish = () => {
        target?.settle();
        publish(options.to, null);
        options.onLand?.(count, count);
        haptic(options.haptic ?? 'success');
      };
      const [origin, source, destination] = await Promise.all([
        measureBox(layer),
        measureBox(options.from),
        target ? measureBox(target.anchor.current ? target.anchor : target.ref) : Promise.resolve(null),
      ]);
      if (m.reduced || !origin || !source || !destination) {
        await new Promise((resolve) => setTimeout(resolve, m.reduced ? 0 : (options.delay ?? 0)));
        finish();
        return;
      }
      const to = centre(destination, origin);
      await new Promise<void>((resolve) => {
        const key = ++keys.current;
        let landed = 0;
        const land = () => {
          landed += 1;
          if (landed < count) {
            target?.pulse();
            publish(options.to, { landed, count, launched: true });
            options.onLand?.(landed, count);
            return;
          }
          setFlights((list) => list.filter((flight) => flight.key !== key));
          if (options.celebrate) setBursts((list) => [...list, { key, at: to }]);
          finish();
          resolve();
        };
        publish(options.to, { landed: 0, count, launched: true });
        setFlights((list) => [
          ...list,
          {
            key,
            from: centre(source, origin),
            to,
            count,
            size: options.size ?? t.points.flight,
            delay: options.delay ?? 0,
            spread: options.spread ?? 'fan',
            reach: Math.min(r.burst, Math.max(source.width, source.height) * 0.4),
            token: options.token,
            land,
          },
        ]);
      });
    },
    [m.reduced, publish],
  );

  const context = useMemo<Context>(
    () => ({
      register: (id, target) => {
        targets.current.set(id, target);
        return () => {
          if (targets.current.get(id) === target) targets.current.delete(id);
        };
      },
      fly,
      progress: (id) => progress.current.get(id) ?? null,
      subscribe: (listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
    }),
    [fly],
  );

  return (
    <FlyContext.Provider value={context}>
      <View style={{ flex: 1 }}>
        {children}
        <View ref={layer} collapsable={false} pointerEvents="none" style={StyleSheet.absoluteFill}>
          {bursts.map((burst) => (
            <View
              key={burst.key}
              style={{
                position: 'absolute',
                left: burst.at.x - width / 2,
                top: burst.at.y - width * 0.4,
                width,
                height: width * 1.8,
              }}>
              <Confetti width={width} />
            </View>
          ))}
          {flights.flatMap((flight) =>
            Array.from({ length: flight.count }, (_, index) => (
              <FlightToken key={`${flight.key}-${index}`} flight={flight} index={index} />
            )),
          )}
        </View>
      </View>
    </FlyContext.Provider>
  );
}

const jitter = (index: number, salt: number) => {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function fanPath(flight: Flight, index: number) {
  const { from, to, count } = flight;
  const side = index % 2 ? 1 : -1;
  const spread = count > 1 ? side * (1 - Math.floor(index / 2) / Math.ceil(count / 2)) : 0;
  const angle = -Math.PI / 2 + spread * (Math.PI * 0.55) + (index % 2 ? 0.18 : -0.18);
  const scatter = count > 1 ? r.scatter * (0.75 + ((index * 37) % 10) / 20) : 0;
  const start = { x: from.x + Math.cos(angle) * scatter, y: from.y + Math.sin(angle) * scatter };
  const distance = Math.hypot(to.x - start.x, to.y - start.y);
  const lift = distance * r.lift * (1 + spread * 0.18);
  const control = {
    x: (start.x + to.x) / 2 + spread * Math.max(distance * 0.12, r.fan),
    y: Math.min(start.y, to.y) - lift,
  };
  const appear = index * r.stagger,
    pop = r.flight * (count > 1 ? 0.22 : 0.12);
  return { start, control, appear, pop, depart: appear + pop * 0.6, total: appear + r.flight };
}

// A burst spills every token around the source at once, then they leave one by one as a stream,
// each on its own bow so the stream reads as many Points rather than one shape.
function burstPath(flight: Flight, index: number) {
  const { from, to, reach } = flight;
  const angle = index * 2.39996 + jitter(index, 1) * 0.6;
  const radius = reach * (0.3 + 0.7 * jitter(index, 2));
  const start = { x: from.x + Math.cos(angle) * radius, y: from.y + Math.sin(angle) * radius * 0.75 - reach * 0.15 };
  const dx = to.x - start.x,
    dy = to.y - start.y,
    distance = Math.hypot(dx, dy) || 1;
  const bow = distance * (r.bow * (0.35 + 0.9 * jitter(index, 3)));
  const control = { x: (start.x + to.x) / 2 + (dy / distance) * bow, y: (start.y + to.y) / 2 - (dx / distance) * bow };
  const depart = r.burstHold + index * r.streamStagger;
  return { start, control, appear: 0, pop: r.burstIn, depart, total: depart + r.streamFlight * (0.88 + 0.24 * jitter(index, 4)) };
}

function FlightToken({ flight, index }: { flight: Flight; index: number }) {
  const elapsed = useSharedValue(0);
  const { from, to, size } = flight;
  const path = useMemo(() => (flight.spread === 'burst' ? burstPath(flight, index) : fanPath(flight, index)), [flight, index]);
  const { start, control, appear, pop, depart, total } = path;
  const grow = flight.spread === 'burst' ? 0.78 + 0.44 * jitter(index, 5) : 1;
  const land = flight.land;
  // Landing is reported a beat before the token arrives, so the target answers as it lands, not after.
  useEffect(() => {
    elapsed.set(withDelay(flight.delay, withTiming(total, { duration: total, easing: Easing.linear })));
    const timer = setTimeout(land, flight.delay + total - r.landLead);
    return () => clearTimeout(timer);
  }, [elapsed, flight.delay, total, land]);
  const style = useAnimatedStyle(() => {
    const time = elapsed.get();
    const out = interpolate(time, [appear, appear + pop], [0, 1], 'clamp');
    const spill = 1 - (1 - out) * (1 - out) * (1 - out);
    const along = travel(interpolate(time, [depart, total], [0, 1], 'clamp'));
    const u = 1 - along;
    const drift = depart > appear + pop ? interpolate(time, [appear + pop, depart], [0, 1], 'clamp') * 0.12 : 0;
    const scatterX = from.x + (start.x - from.x) * (spill + drift);
    const scatterY = from.y + (start.y - from.y) * (spill + drift);
    const x = u * u * scatterX + 2 * u * along * control.x + along * along * to.x;
    const y = u * u * scatterY + 2 * u * along * control.y + along * along * to.y;
    const scale =
      time <= appear ? 0 : grow * interpolate(along, [0, 0.8, 1], [1, 1, r.land], 'clamp') * interpolate(out, [0, 1], [0.3, 1]);
    const opacity = interpolate(time, [appear, appear + pop * 0.25, total - (total - depart) * 0.08, total], [0, 1, 1, 0], 'clamp');
    return {
      opacity,
      transform: [{ translateX: x - size / 2 }, { translateY: y - size / 2 }, { scale }],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: 0, top: 0, minWidth: size, height: size, alignItems: 'center', justifyContent: 'center' },
        style,
      ]}>
      {flight.token(index)}
    </Animated.View>
  );
}

export function useFlyToTarget() {
  const context = useContext(FlyContext);
  return useCallback(
    (options: FlightOptions) => {
      if (context) return context.fly(options);
      options.onLand?.(flightCount(options.count), flightCount(options.count));
      haptic(options.haptic ?? 'success');
      return Promise.resolve();
    },
    [context],
  );
}

export function useFlyTarget(id: string, pulseScale: number = r.pulse, settleScale: number = pulseScale) {
  const context = useContext(FlyContext);
  const m = useMotion();
  const ref = useRef<View>(null);
  const anchor = useRef<View>(null);
  const scale = useSharedValue(1);
  const pulse = useCallback(() => {
    if (m.reduced) return;
    scale.set(
      withSequence(
        withTiming(pulseScale, { duration: r.pulseIn, easing: Easing.out(Easing.quad) }),
        withSpring(1, t.motion.spring.pop),
      ),
    );
  }, [m.reduced, scale, pulseScale]);
  const settle = useCallback(() => {
    if (m.reduced) return;
    scale.set(
      withSequence(
        withTiming(settleScale, { duration: r.pulseIn * 1.5, easing: Easing.out(Easing.quad) }),
        withSpring(1, t.motion.spring.pop),
      ),
    );
  }, [m.reduced, scale, settleScale]);
  useEffect(() => context?.register(id, { ref, anchor, pulse, settle }), [context, id, pulse, settle]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return { ref, anchor, style, pulse };
}

const idle = () => null;
const noSubscription = () => () => undefined;

export function useFlightProgress(id: string) {
  const context = useContext(FlyContext);
  const read = useCallback(() => context?.progress(id) ?? null, [context, id]);
  return useSyncExternalStore(context?.subscribe ?? noSubscription, context ? read : idle);
}

// 'stream' moves the value with each landing, fastest at first; 'launch' moves it once as the tokens leave;
// 'end' holds it until the last token lands.
export function useLandingValue(id: string, value: number, mode: 'stream' | 'launch' | 'end' = 'stream') {
  const progress = useFlightProgress(id);
  const [base, setBase] = useState(value);
  if (!progress && base !== value) setBase(value);
  if (!progress) return value;
  if (mode === 'launch') return progress.launched ? value : base;
  if (mode === 'end') return base;
  const landed = progress.landed / progress.count;
  return base + Math.round((value - base) * (1 - (1 - landed) * (1 - landed)));
}
