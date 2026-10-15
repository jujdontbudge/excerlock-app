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
import { scheduleOnRN } from 'react-native-worklets';
import { Confetti } from './Confetti';
import { haptic, HapticIntent } from './haptics';
import { tokens as t } from './tokens';
import { useMotion } from './useMotion';

type Point = { x: number; y: number };
export type Box = Point & { width: number; height: number };
export type FlightProgress = { landed: number; count: number };
export type FlightSource = RefObject<View | null> | Box;
export type FlightOptions = {
  from: FlightSource;
  to: string;
  token: (index: number) => ReactNode;
  count?: number;
  size?: number;
  delay?: number;
  haptic?: HapticIntent;
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
  token: (index: number) => ReactNode;
  land: () => void;
};
type Target = { ref: RefObject<View | null>; anchor: RefObject<View | null>; pulse: () => void };
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
      publish(options.to, { landed: 0, count });
      const finish = () => {
        target?.pulse();
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
            publish(options.to, { landed, count });
            options.onLand?.(landed, count);
            return;
          }
          setFlights((list) => list.filter((flight) => flight.key !== key));
          if (options.celebrate) setBursts((list) => [...list, { key, at: to }]);
          finish();
          resolve();
        };
        setFlights((list) => [
          ...list,
          {
            key,
            from: centre(source, origin),
            to,
            count,
            size: options.size ?? t.points.flight,
            delay: options.delay ?? 0,
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

function FlightToken({ flight, index }: { flight: Flight; index: number }) {
  const elapsed = useSharedValue(0);
  const { from, to, size, count } = flight;
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
  const burst = count > 1 ? 0.22 : 0.12;
  const land = flight.land;
  useEffect(() => {
    elapsed.set(
      withDelay(
        flight.delay + index * r.stagger,
        withTiming(1, { duration: r.flight, easing: Easing.linear }, (done) => {
          if (done) scheduleOnRN(land);
        }),
      ),
    );
  }, [elapsed, flight.delay, index, land]);
  const style = useAnimatedStyle(() => {
    const time = elapsed.get();
    const out = interpolate(time, [0, burst], [0, 1], 'clamp');
    const pop = 1 - (1 - out) * (1 - out);
    const along = travel(interpolate(time, [burst * 0.6, 1], [0, 1], 'clamp'));
    const u = 1 - along;
    const scatterX = from.x + (start.x - from.x) * pop;
    const scatterY = from.y + (start.y - from.y) * pop;
    const x = u * u * scatterX + 2 * u * along * control.x + along * along * to.x;
    const y = u * u * scatterY + 2 * u * along * control.y + along * along * to.y;
    const scale = time === 0 ? 0 : interpolate(time, [0, burst, 0.85, 1], [0.4, 1, 1, r.land], 'clamp');
    const opacity = interpolate(time, [0, 0.04, 0.9, 1], [0, 1, 1, 0], 'clamp');
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

export function useFlyTarget(id: string, pulseScale: number = r.pulse) {
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
  useEffect(() => context?.register(id, { ref, anchor, pulse }), [context, id, pulse]);
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

export function useLandingValue(id: string, value: number) {
  const progress = useFlightProgress(id);
  const [base, setBase] = useState(value);
  if (!progress && base !== value) setBase(value);
  if (!progress) return value;
  return base + Math.round(((value - base) * progress.landed) / progress.count);
}
