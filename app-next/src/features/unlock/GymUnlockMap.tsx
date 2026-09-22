import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';
import { Icon } from '../../icons/Icon';
import { tokens as t } from '../../design-system/tokens';
import { Coordinates } from '../../ports/PlaceSearch';
import { SavedPlace } from '../../ports/models';
import { defaultCentre } from '../gym-picker/usePicker';
import { regionForRadius } from '../gym-picker/geometry';
import { unlockCopy as c } from '../../content/unlock';
export function GymUnlockMap({
  location,
  gym,
  inside,
}: {
  location: Coordinates | null;
  gym?: SavedPlace;
  inside: boolean;
}) {
  const map = useRef<MapView>(null),
    [following, setFollowing] = useState(true),
    [showGym, setShowGym] = useState(false);
  const region = (point: Coordinates, radius = 150) => regionForRadius(point, radius, { width: 350, height: 350 });
  useEffect(() => {
    if (following && location) map.current?.animateToRegion(region(location), 350);
  }, [location, following]);
  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={map}
        accessibilityLabel="Map of your location"
        style={StyleSheet.absoluteFill}
        initialRegion={region(location ?? gym ?? defaultCentre)}
        showsUserLocation
        showsMyLocationButton={false}
        mapPadding={{ top: 0, right: 0, bottom: t.space.lg, left: t.space.sm }}
        onPanDrag={() => {
          setFollowing(false);
          setShowGym(false);
        }}>
        {gym && (inside || showGym) ? (
          <>
            <Circle
              center={gym}
              radius={gym.radiusMeters}
              fillColor="rgba(239,76,0,0.18)"
              strokeColor={t.brand.primary}
              strokeWidth={1.5}
            />
            <Marker coordinate={gym} title={gym.name} pinColor={t.brand.primary} />
          </>
        ) : null}
      </MapView>
      <View style={{ position: 'absolute', right: 16, bottom: 24, gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={c.gym.centerMe}
          onPress={() => {
            setFollowing(true);
            if (location) map.current?.animateToRegion(region(location), 350);
          }}
          style={s.disc}>
          <Icon name="map-pin" variant="utility" tint={following ? t.brand.primary : t.text.secondary} size={t.icon.md} />
        </Pressable>
        {gym ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={c.gym.centerGym}
            onPress={() => {
              setFollowing(false);
              setShowGym(true);
              map.current?.animateToRegion(region(gym, gym.radiusMeters), 350);
            }}
            style={s.disc}>
            <Icon name="gym" variant="utility" tint={t.brand.primary} size={t.icon.md} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
const s = StyleSheet.create({
  disc: {
    width: 44,
    height: 44,
    borderRadius: t.radius.pill,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 3px 10px #0002',
  },
});
