import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { tokens as t } from './tokens';
import { illustrationTokens as art } from './illustrationTokens';

const systemAlert = art.systemAlert,
  a = systemAlert;

/** An iOS alert word for word: `tap` turns the permission on and `deny` refuses it. */
export type SystemAlertCopy = {
  title: string;
  message: string;
  buttons: readonly string[];
  tap: number;
  deny: number;
};

/**
 * The iOS 26 system alert, drawn to Apple's measurements: a light rounded card, a bold title and
 * grey message aligned left, and grey pill buttons, side by side when two short labels fit and
 * stacked otherwise. With `guide`, the button to tap gets an orange outline and an orange arrow
 * in the margin beside the alert (ADR 0043). With `onPress` the buttons answer, for the simulator
 * demo that stands in for the real alert; without it this is a picture.
 */
export function SystemAlert({
  alert,
  guide = false,
  onPress,
  onLayout,
}: {
  alert: SystemAlertCopy;
  guide?: boolean;
  onPress?: (index: number) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  const { title, message, buttons, tap } = alert,
    row = buttons.length === 2 && buttons.every((label) => label.length <= a.rowLabel),
    // The arrow sits in the margin nearest the button: left only for the left one of a row.
    left = row && tap === 0;
  return (
    <View
      onLayout={onLayout}
      style={{
        width: a.width,
        backgroundColor: a.fill,
        borderRadius: a.radius,
        borderCurve: 'continuous',
        paddingTop: a.padTop,
        paddingBottom: a.padBottom,
      }}>
      <View style={{ paddingHorizontal: a.padX, gap: a.textGap }}>
        <Text accessibilityRole={onPress ? 'header' : undefined} style={[systemAlert.title, { color: a.text }]}>
          {title}
        </Text>
        {message ? <Text style={[systemAlert.body, { color: a.message }]}>{message}</Text> : null}
      </View>
      <View
        style={{
          marginTop: a.buttonsTop,
          paddingHorizontal: a.inset,
          flexDirection: row ? 'row' : 'column',
          gap: a.buttonGap,
        }}>
        {buttons.map((label, index) => {
          const marked = guide && index === tap;
          return (
            <Pressable
              key={label}
              disabled={!onPress}
              accessibilityRole={onPress ? 'button' : undefined}
              accessibilityLabel={onPress ? label : undefined}
              onPress={() => onPress?.(index)}
              style={{
                flex: row ? 1 : undefined,
                height: a.button,
                borderRadius: a.buttonRadius,
                backgroundColor: a.buttonFill,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: marked ? a.ring : 0,
                borderColor: t.brand.primary,
              }}>
              <Text numberOfLines={1} style={[systemAlert.action, { color: a.text }]}>
                {label}
              </Text>
              {marked ? <Arrow left={left} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** The hand-drawn arrow, its tip level with the middle of the button and just clear of the alert. */
function Arrow({ left }: { left: boolean }) {
  const { width, height, stroke, tip, offset, curve, head } = a.arrow,
    // The arrow's box is placed from the button's inner edge, inside its outline.
    side = left
      ? ({ right: '100%', marginRight: offset + a.ring } as const)
      : ({ left: '100%', marginLeft: offset + a.ring } as const);
  return (
    <View
      style={[
        {
          position: 'absolute',
          top: a.button / 2 - tip.y - a.ring,
          width,
          height,
          transform: left ? [{ scaleX: -1 }] : undefined,
        },
        side,
      ]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Path
          d={`${curve} ${head}`}
          stroke={t.brand.primary}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}
