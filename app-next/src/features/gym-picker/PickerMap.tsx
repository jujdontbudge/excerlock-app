import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';
import Svg, { Circle, Path } from 'react-native-svg';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Label } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { gymPickerTokens as g } from '../../design-system/gymPickerTokens';
import { gymPickerCopy as c } from '../../content/gymPicker';
import { useMotion } from '../../motion/useMotion';
import { feedback } from '../../motion/haptics';
import { Coordinates } from '../../ports/PlaceSearch';
import { MapRegion, metresToPoints, regionForRadius } from './geometry';
const Ring = Animated.createAnimatedComponent(Circle);
const Mask = Animated.createAnimatedComponent(Path);
export function PickerMap({
  coordinate,
  radius,
  name,
  height,
  showLocation,
  onSettle,
}: {
  coordinate: Coordinates;
  radius: number;
  name: string;
  height: number;
  showLocation: boolean;
  onSettle: (coordinate: Coordinates) => void;
}) {
  const map = useRef<MapView>(null),
    moving = useRef(false),
    m = useMotion();
  const [size, setSize] = useState({ width: 0, height }),
    [hint, setHint] = useState(true);
  const [initial] = useState(() => regionForRadius(coordinate, radius, { width: 360, height }));
  const region = useSharedValue(initial),
    radiusValue = useSharedValue(radius),
    width = useSharedValue(0),
    mapHeight = useSharedValue(height),
    lift = useSharedValue(0);
  const latestRadius = useRef(radius);
  useEffect(() => {
    latestRadius.current = radius;
    radiusValue.set(m.reduced ? radius : withSpring(radius, t.motion.spring.control));
  }, [radius, radiusValue, m.reduced]);
  const circle = useAnimatedProps(() => ({
    r: Math.min(
      Math.hypot(width.get(), mapHeight.get()) * 2,
      metresToPoints(region.get(), width.get(), radiusValue.get()),
    ),
  }));
  const mask = useAnimatedProps(() => {
    const w = width.get(),
      h = mapHeight.get(),
      x = w / 2,
      y = h / 2;
    const r = Math.min(Math.hypot(w, h) * 2, metresToPoints(region.get(), w, radiusValue.get()));
    return { d: `M0 0H${w}V${h}H0Z M${x - r} ${y}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0` };
  });
  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.get() * g.pin.lift }, { scale: 1 + lift.get() * (g.pin.scale - 1) }],
  }));
  const change = (next: MapRegion) => {
    region.set(next);
    if (!moving.current) {
      moving.current = true;
      if (!m.reduced) lift.set(withSpring(1, t.motion.spring.control));
    }
  };
  return (
    <View
      style={{ height, borderRadius: t.radius.sheet, overflow: 'hidden', backgroundColor: t.surface.subtle }}
      onLayout={(e) => {
        const next = e.nativeEvent.layout;
        if (next.width === size.width && next.height === size.height) return;
        setSize(next);
        width.set(next.width);
        mapHeight.set(next.height);
        const fitted = regionForRadius(coordinate, latestRadius.current, next);
        region.set(fitted);
        map.current?.animateToRegion(fitted, m.reduced ? 0 : m.duration.navigation);
      }}>
      <MapView
        ref={map}
        testID="gym-map"
        accessibilityLabel={c.map}
        style={StyleSheet.absoluteFill}
        initialRegion={initial}
        showsUserLocation={showLocation}
        showsPointsOfInterests
        showsCompass={false}
        rotateEnabled={false}
        pitchEnabled={false}
        onRegionChange={change}
        onPanDrag={() => setHint(false)}
        onRegionChangeComplete={(next) => {
          region.set(next);
          onSettle({ latitude: next.latitude, longitude: next.longitude });
          if (moving.current) feedback();
          moving.current = false;
          lift.set(m.reduced ? 0 : withSpring(0, t.motion.spring.control));
        }}
      />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Mask animatedProps={mask} fill={g.ring.dim} fillRule="evenodd" />
          <Ring
            cx={size.width / 2}
            cy={size.height / 2}
            animatedProps={circle}
            stroke={t.brand.primary}
            strokeWidth={g.ring.stroke}
            fill={g.ring.fill}
          />
        </Svg>
        <View
          style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            alignItems: 'center',
            marginTop: -g.pin.size / 2,
          }}>
          <Animated.View
            style={[
              {
                width: g.pin.size,
                height: g.pin.size,
                borderRadius: t.radius.pill,
                backgroundColor: t.brand.primary,
                borderWidth: g.pin.border,
                borderColor: t.surface.card,
                boxShadow: t.shadow.cta,
              },
              pinStyle,
            ]}
          />
          <View
            style={{
              maxWidth: '80%',
              marginTop: t.space.sm,
              paddingHorizontal: t.space.md,
              paddingVertical: t.space.xs,
              borderRadius: t.radius.pill,
              backgroundColor: t.surface.card,
              boxShadow: t.shadow.cta,
            }}>
            <Label numberOfLines={1} variant="support">
              {name || c.newName}
            </Label>
          </View>
        </View>
        {hint ? (
          <View
            style={{
              position: 'absolute',
              bottom: t.space.lg,
              alignSelf: 'center',
              backgroundColor: t.surface.card,
              paddingHorizontal: t.space.md,
              paddingVertical: t.space.sm,
              borderRadius: t.radius.pill,
            }}>
            <Label variant="support">{c.hint}</Label>
          </View>
        ) : null}
      </View>
    </View>
  );
}
