import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';
import { Icon } from '../../ui/Icon';
import { Label } from '../../ui';
import { tokens as t } from '../../ui/tokens';
import { useMotion } from '../../ui/useMotion';
import { Coordinates } from '../../ports/PlaceSearch';
import { SavedPlace } from '../../model/models';
import { circleEdge, distanceMetres, gymMapRegion, pointInMap, regionForRadius, type MapRegion } from '../../gyms/geometry';
import { gymDistance } from '../../gyms/gymDistance';
import { settingsStore as useSettingsStore } from '../../preferences/settingsStore';
import { unlockCopy as c } from './unlockCopy';
export const GymUnlockMap = memo(function GymUnlockMap({ location, gym, inside }: { location: Coordinates | null; gym?: SavedPlace; inside: boolean }) {
  const map = useRef<MapView>(null), frame = useRef<MapRegion | null>(null), framedGym = useRef<string | null>(null);
  const [following, setFollowing] = useState(true), [ready, setReady] = useState(false), [size, setSize] = useState({ width: 1, height: 1 });
  const m = useMotion(), units = useSettingsStore((s) => s.data.units);
  const fitted = useMemo(() => gym ? gymMapRegion(gym, gym.radiusMeters, location, size, t.control.full) : location ? regionForRadius(location, 150, size) : null, [gym, location, size]);
  const fit = (region: MapRegion) => { frame.current = region; map.current?.animateToRegion(region, m.reduced ? 0 : m.duration.emphasized); };
  useEffect(() => {
    if (!ready || !fitted || size.width <= 1 || size.height <= 1 || !following) return;
    if (framedGym.current !== (gym?.id ?? '') || !frame.current || (location && !pointInMap(location, frame.current))) {
      framedGym.current = gym?.id ?? '';
      frame.current = fitted;
      map.current?.animateToRegion(fitted, m.reduced ? 0 : m.duration.emphasized);
    }
  }, [ready, fitted, following, gym, location, m, size]);
  const distance = gym && location ? Math.max(0, distanceMetres(location, gym) - gym.radiusMeters) : null;
  const outside = distance !== null && distance > 0;
  return (
    <View style={{ flex: 1 }} onLayout={(e) => setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      <MapView ref={map} accessibilityLabel="Map of your location and gym" style={StyleSheet.absoluteFill}
        initialRegion={gym ? regionForRadius(gym, gym.radiusMeters, { width: 1, height: 1 }) : location ? regionForRadius(location, 150, { width: 1, height: 1 }) : { latitude: 0, longitude: 0, latitudeDelta: 120, longitudeDelta: 120 }}
        showsMyLocationButton={false} onMapReady={() => setReady(true)} onPanDrag={() => setFollowing(false)}
        onRegionChangeComplete={(region) => { frame.current = region; }}>
        {gym ? <>
          <Circle center={gym} radius={gym.radiusMeters} fillColor={t.map.geofence} strokeColor={t.brand.primary} strokeWidth={t.map.ring.stroke} />
          <Marker coordinate={gym} title={gym.name} pinColor={t.brand.primary} accessibilityLabel={`Gym circle: ${gym.name}`} />
          {outside && location ? <Polyline coordinates={[location, circleEdge(gym, gym.radiusMeters, location)]} strokeColor={t.brand.primary} strokeWidth={t.map.ring.stroke} lineDashPattern={[t.space.sm, t.space.xs]} /> : null}
        </> : null}
        {location ? <Marker coordinate={location} title="Your location" anchor={{ x: 0.5, y: 0.5 }}>
          <View style={s.user} />
        </Marker> : null}
      </MapView>
      {gym && distance !== null && !inside ? <View style={s.distance}><Label variant="support">{c.gym.distance(gymDistance(distance, units), gym.name)}</Label></View> : null}
      <View style={{ position: 'absolute', right: t.space.lg, bottom: t.space.xl, gap: t.space.sm }}>
        <Pressable accessibilityRole="button" accessibilityLabel={c.gym.centerMe} onPress={() => { setFollowing(true); if (fitted) fit(fitted); }} style={s.disc}>
          <Icon name="map-pin" variant="utility" tone={following ? 'accent' : 'muted'} size={t.icon.md} />
        </Pressable>
        {gym ? <Pressable accessibilityRole="button" accessibilityLabel={c.gym.centerGym} onPress={() => { setFollowing(false); fit(regionForRadius(gym, gym.radiusMeters, size)); }} style={s.disc}>
          <Icon name="gym" variant="utility" size={t.icon.md} />
        </Pressable> : null}
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  disc: { width: t.control.inline, height: t.control.inline, borderRadius: t.radius.pill, backgroundColor: t.surface.softChoice, borderWidth: t.stroke.hairline, borderColor: t.surface.transparent, alignItems: 'center', justifyContent: 'center', boxShadow: t.shadow.control },
  user: { width: t.space.lg, height: t.space.lg, borderRadius: t.radius.pill, backgroundColor: t.swatch.sky, borderWidth: t.stroke.selected, borderColor: t.surface.card },
  distance: { position: 'absolute', top: t.space.sm, left: t.space.sm, right: t.space.sm, padding: t.space.sm, backgroundColor: t.surface.softChoice, borderWidth: t.stroke.hairline, borderColor: t.surface.transparent, borderRadius: t.radius.pill, alignItems: 'center' },
});
