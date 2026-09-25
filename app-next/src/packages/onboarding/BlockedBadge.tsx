import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { tokens as t } from '../ui/tokens';
import { illustrationTokens as art } from '../ui/illustrationTokens';
export function BlockedBadge({ variant = 'hourglass', size = art.welcome.tile.badge, offset = art.welcome.tile.badgeOffset }: {
  variant?: 'hourglass' | 'lock';
  size?: number;
  offset?: number;
}) {
  return (
    <View
      style={{
        position: 'absolute',
        right: offset,
        top: offset,
        width: size,
        height: size,
        borderRadius: t.radius.pill,
        backgroundColor: t.surface.card,
        boxShadow: art.welcome.tile.shadow,
        padding: t.space.xs,
      }}>
      <Svg viewBox="0 0 24 24" width="100%" height="100%" accessible={false}>
        {variant === 'lock' ? (
          <Path
            d="M7 10V7a5 5 0 0110 0v3M5 10h14v11H5zM12 14v3"
            fill="none"
            stroke={t.text.primary}
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <>
            <Path
              d="M7 3h10M7 21h10M8 3c0 5 1 6 4 9-3 3-4 4-4 9M16 3c0 5-1 6-4 9 3 3 4 4 4 9"
              fill="none"
              stroke={t.text.primary}
              strokeWidth="2.6"
              strokeLinecap="round"
            />
            <Path d="m9 5 3 4 3-4ZM9 19l3-4 3 4Z" fill={t.text.primary} />
          </>
        )}
      </Svg>
    </View>
  );
}
