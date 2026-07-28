import '@expo/metro-runtime';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { ComponentProps, ReactNode, useEffect, useRef, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { GestureHandlerRootView, Pressable } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ConfettiHandle, ConfettiLayer } from './src/ConfettiLayer';

const FRAME_WIDTH = 393;
const FRAME_HEIGHT = 852;
// The generated shackle's leg centers are 576.65 px apart inside its 732 px
// alpha crop. At the 92 pt rendered width, that is the socket-to-socket shift.
const SHACKLE_SOCKET_SPACING = 72.5;
// The shackle ends at y=96 and the body sockets start at y=66: 30 pt of leg
// must clear the body, then another 45 pt creates the airborne reference gap.
const SHACKLE_POP_HEIGHT = 75;
const FONT_FAMILY = Platform.select({
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif',
  default: 'System',
});

const GRADIENT_COLORS = [
  '#F98529',
  '#F97A22',
  '#F76D1C',
  '#F45C11',
  '#F44D09',
  '#F04205',
  '#EB2E02',
] as const;

type Crop = readonly [number, number, number, number];

const ASSETS = {
  gym: require('./assets/icons/gym-card.png'),
  lockBody: require('./assets/icons/lock-body.png'),
  lockShackle: require('./assets/icons/lock-shackle.png'),
  miniLock: require('./assets/icons/icon-padlock-mini.png'),
  chipLock: require('./assets/icons/icon-padlock-chip.png'),
  sparkle: require('./assets/icons/icon-sparkle.png'),
  pencil: require('./assets/icons/icon-pencil.png'),
  arrow: require('./assets/icons/icon-arrow-right.png'),
  info: require('./assets/icons/icon-info.png'),
  alarm: require('./assets/icons/icon-tab-alarm.png'),
  music: require('./assets/icons/icon-tab-music.png'),
  spiral: require('./assets/icons/icon-tab-spiral.png'),
  mountain: require('./assets/icons/icon-tab-mountain.png'),
  chart: require('./assets/icons/icon-tab-chart.png'),
} satisfies Record<string, ImageSourcePropType>;

const CROPS = {
  lockBody: [102, 147, 922, 885],
  lockShackle: [146, 99, 878, 891],
  miniLock: [444, 415, 580, 591],
  chipLock: [362, 324, 662, 701],
  sparkle: [186, 186, 838, 838],
  pencil: [150, 122, 892, 866],
  arrow: [128, 254, 910, 770],
  info: [124, 116, 892, 900],
  alarm: [193, 144, 831, 867],
  music: [247, 139, 761, 859],
  spiral: [148, 152, 876, 842],
  mountain: [123, 234, 901, 776],
  chart: [167, 173, 856, 847],
} satisfies Record<string, Crop>;

type CroppedAssetProps = {
  source: ImageSourcePropType;
  crop: Crop;
  width: number;
  height: number;
  tintColor?: string;
  style?: StyleProp<ViewStyle>;
};

function CroppedAsset({ source, crop, width, height, tintColor, style }: CroppedAssetProps) {
  const [left, top, right, bottom] = crop;
  const scaleX = width / (right - left);
  const scaleY = height / (bottom - top);

  return (
    <View style={[{ width, height, overflow: 'hidden' }, style]}>
      <Image
        source={source}
        resizeMode="stretch"
        tintColor={tintColor}
        style={{
          position: 'absolute',
          left: -left * scaleX,
          top: -top * scaleY,
          width: 1024 * scaleX,
          height: 1024 * scaleY,
        }}
      />
    </View>
  );
}

type FeedbackPressableProps = Omit<ComponentProps<typeof Pressable>, 'children' | 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  pressedScale?: number;
  hitSlop?: number;
};

function FeedbackPressable({
  children,
  style,
  contentStyle,
  pressedScale = 0.96,
  onPressIn,
  onPressOut,
  disabled,
  hitSlop,
  ...props
}: FeedbackPressableProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      {...props}
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={style}
    >
      <Animated.View
        style={[
          styles.pressableContent,
          contentStyle,
          {
            opacity: pressed ? 0.86 : 1,
            transform: [{ scale: pressed ? pressedScale : 1 }],
            transitionProperty: ['transform', 'opacity'],
            transitionDuration: '100ms',
            transitionTimingFunction: 'ease-out',
          } as ViewStyle,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

function StatusBarMock() {
  return (
    <View style={styles.statusBar} pointerEvents="none">
      <Text style={styles.statusTime}>9.41</Text>
      <View style={styles.statusRight}>
        <View style={styles.signalBars}>
          {[4, 7, 10, 14].map((height) => (
            <View key={height} style={[styles.signalBar, { height }]} />
          ))}
        </View>
        <View style={styles.wifiIcon}>
          <View style={styles.wifiArcs}>
            <View style={styles.wifiOuter} />
            <View style={styles.wifiInner} />
          </View>
          <View style={styles.wifiDot} />
        </View>
        <View style={styles.batteryShell}>
          <View style={styles.batteryFill} />
          <View style={styles.batteryNub} />
        </View>
      </View>
    </View>
  );
}

type PlaceholderProps = {
  name: string;
  onBack: () => void;
};

function Placeholder({ name, onBack }: PlaceholderProps) {
  return (
    <GradientScreen>
      <FeedbackPressable
        accessibilityLabel="Back"
        accessibilityRole="button"
        hitSlop={12}
        onPress={onBack}
        style={styles.backButton}
        contentStyle={styles.backButtonSurface}
      >
        <Text style={styles.backButtonText}>‹ Back</Text>
      </FeedbackPressable>
      <Text style={styles.placeholderTitle}>{name}</Text>
      <HomeIndicator />
    </GradientScreen>
  );
}

function GradientScreen({ children }: { children: ReactNode }) {
  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      locations={[0, 0.15, 0.3, 0.44, 0.6, 0.72, 1]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFill}
    >
      {children}
    </LinearGradient>
  );
}

function HomeIndicator() {
  return <View pointerEvents="none" style={styles.homeIndicator} />;
}

function Dashboard({ navigate }: { navigate: (name: string) => void }) {
  const [completed, setCompleted] = useState(false);
  const confettiRef = useRef<ConfettiHandle>(null);

  const labelProgress = useSharedValue(0);
  const buttonWidth = useSharedValue(103);
  const lockScale = useSharedValue(1);
  const lockY = useSharedValue(0);
  const shackleX = useSharedValue(0);
  const shackleY = useSharedValue(0);
  const bodyScale = useSharedValue(1);
  const bodyRotation = useSharedValue(0);

  const completeLabelStyle = useAnimatedStyle(() => ({ opacity: 1 - labelProgress.value }));
  const completedLabelStyle = useAnimatedStyle(() => ({ opacity: labelProgress.value }));
  const completeButtonStyle = useAnimatedStyle(() => ({ width: buttonWidth.value }));
  const lockGroupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lockY.value }, { scale: lockScale.value }],
  }));
  const shackleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shackleX.value }, { translateY: shackleY.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bodyScale.value }, { rotate: `${bodyRotation.value}deg` }],
  }));

  const playCompletion = () => {
    if (completed) return;
    setCompleted(true);

    if (Platform.OS !== 'web') {
      setTimeout(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 80);
    }

    labelProgress.value = withDelay(
      100,
      withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) }),
    );
    buttonWidth.value = withDelay(100, withSpring(124, { damping: 15, stiffness: 210 }));

    lockScale.value = withDelay(
      350,
      withSequence(
        withTiming(0.97, { duration: 100, easing: Easing.inOut(Easing.quad) }),
        withSpring(1, { damping: 13, stiffness: 210 }),
      ),
    );
    lockY.value = withDelay(
      350,
      withSequence(
        withTiming(3, { duration: 100, easing: Easing.inOut(Easing.quad) }),
        withSpring(0, { damping: 13, stiffness: 210 }),
      ),
    );

    // The shackle never hinges or swings. It rises until both legs clear the
    // body, drifts one measured socket-width to the right while airborne, and
    // drops with its left leg into the body's former right socket.
    shackleY.value = withDelay(
      450,
      withSequence(
        withSpring(-SHACKLE_POP_HEIGHT, { duration: 300, dampingRatio: 0.72 }),
        withSpring(0, { duration: 350, dampingRatio: 0.76 }),
      ),
    );
    shackleX.value = withDelay(
      550,
      withTiming(SHACKLE_SOCKET_SPACING, {
        duration: 400,
        easing: Easing.inOut(Easing.cubic),
      }),
    );
    bodyScale.value = withDelay(
      450,
      withSequence(
        withSpring(1.06, { damping: 10, stiffness: 240 }),
        withSpring(1, { damping: 13, stiffness: 210 }),
      ),
    );
    bodyRotation.value = withDelay(
      450,
      withSequence(
        withSpring(-3, { damping: 11, stiffness: 220 }),
        withSpring(0, { damping: 13, stiffness: 210 }),
      ),
    );

    setTimeout(() => confettiRef.current?.fire(), 500);
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || new URLSearchParams(window.location.search).get('autoplay') !== '1') {
      return;
    }
    const timer = window.setTimeout(playCompletion, 200);
    return () => window.clearTimeout(timer);
    // This opt-in URL is only an acceptance-capture hook; normal app behavior is tap-driven.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GradientScreen>
      <StatusBarMock />

      <View style={styles.progressTrack} pointerEvents="none">
        <View style={styles.progressComplete} />
        <View style={styles.progressRemaining} />
      </View>
      <FeedbackPressable
        accessibilityLabel="Goal progress: 50 percent"
        accessibilityRole="button"
        hitSlop={9}
        onPress={() => undefined}
        style={styles.progressThumbButton}
        contentStyle={styles.progressThumb}
      >
        <CroppedAsset
          source={ASSETS.miniLock}
          crop={CROPS.miniLock}
          width={11}
          height={14}
          tintColor="#4B4B4D"
        />
      </FeedbackPressable>
      <Text style={styles.goalCaption}>50% of goal completed</Text>

      <Animated.View style={[styles.lockGroup, lockGroupStyle]} pointerEvents="none">
        <Animated.View testID="shackle-layer" style={[styles.shackleLayer, shackleStyle]}>
          <CroppedAsset
            source={ASSETS.lockShackle}
            crop={CROPS.lockShackle}
            width={92}
            height={96}
          />
        </Animated.View>
        <Animated.View style={[styles.bodyLayer, bodyStyle]}>
          <CroppedAsset
            source={ASSETS.lockBody}
            crop={CROPS.lockBody}
            width={130}
            height={133}
          />
        </Animated.View>
      </Animated.View>

      <View style={styles.statsRow}>
        <View style={styles.statGroupLeft}>
          <FeedbackPressable
            accessibilityLabel="Time Locked"
            accessibilityRole="button"
            hitSlop={5}
            onPress={() => undefined}
            style={styles.statChipButton}
            contentStyle={styles.statChipWhite}
          >
            <CroppedAsset
              source={ASSETS.chipLock}
              crop={CROPS.chipLock}
              width={15}
              height={19}
              tintColor="#414144"
            />
          </FeedbackPressable>
          <View style={styles.leftStatText}>
            <Text style={styles.statLabel}>Time Locked</Text>
            <Text style={styles.statValue}>2h 14m</Text>
          </View>
        </View>

        <View style={styles.statGroupRight}>
          <View style={styles.rightStatText}>
            <Text style={[styles.statLabel, styles.rightAligned]}>Screen Time</Text>
            <Text style={[styles.statValue, styles.rightAligned]}>1h 32m</Text>
          </View>
          <FeedbackPressable
            accessibilityLabel="Screen Time"
            accessibilityRole="button"
            hitSlop={5}
            onPress={() => undefined}
            style={styles.sparkleChipButton}
            contentStyle={styles.sparkleChip}
          >
            <CroppedAsset source={ASSETS.sparkle} crop={CROPS.sparkle} width={18} height={18} />
          </FeedbackPressable>
        </View>
      </View>

      <View style={styles.gymCard}>
        <Image source={ASSETS.gym} resizeMode="stretch" style={styles.gymImage} />
        <FeedbackPressable
          accessibilityLabel="Info"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => navigate('Info')}
          style={styles.infoButton}
          contentStyle={styles.infoButtonSurface}
        >
          <CroppedAsset source={ASSETS.info} crop={CROPS.info} width={24} height={24} />
        </FeedbackPressable>
        <Text style={styles.gymTitle}>Go to gym</Text>
        <FeedbackPressable
          accessibilityLabel={completed ? 'Completed' : 'Complete'}
          accessibilityRole="button"
          accessibilityState={{ disabled: completed }}
          disabled={completed}
          onPress={playCompletion}
          pressedScale={0.95}
          testID="complete-button"
          style={[styles.completeButtonHitArea, completed && styles.completedButtonDisabled]}
          contentStyle={[styles.completeButton, completeButtonStyle as unknown as ViewStyle]}
        >
          <View style={styles.completeLabelStack}>
            <Animated.Text style={[styles.completeLabel, completeLabelStyle]}>Complete</Animated.Text>
            <Animated.Text style={[styles.completeLabel, styles.completedLabel, completedLabelStyle]}>
              ✓ Completed
            </Animated.Text>
          </View>
        </FeedbackPressable>
      </View>

      <FeedbackPressable
        accessibilityLabel="Edit"
        accessibilityRole="button"
        onPress={() => navigate('Edit')}
        style={styles.editRowButton}
        contentStyle={styles.actionRow}
      >
        <Text style={styles.actionLabel}>Edit</Text>
        <CroppedAsset
          source={ASSETS.pencil}
          crop={CROPS.pencil}
          width={20}
          height={20}
          tintColor="#FC5F02"
        />
      </FeedbackPressable>

      <FeedbackPressable
        accessibilityLabel="Analysis"
        accessibilityRole="button"
        onPress={() => navigate('Analysis')}
        style={styles.analysisRowButton}
        contentStyle={styles.actionRow}
      >
        <Text style={styles.actionLabel}>Analysis</Text>
        <CroppedAsset
          source={ASSETS.arrow}
          crop={CROPS.arrow}
          width={21}
          height={15}
          tintColor="#FE6003"
        />
      </FeedbackPressable>

      <View style={styles.tabRow}>
        <TabButton
          label="Alarm"
          source={ASSETS.alarm}
          crop={CROPS.alarm}
          width={27}
          height={30}
          onPress={() => navigate('Alarm')}
        />
        <TabButton
          label="Music"
          source={ASSETS.music}
          crop={CROPS.music}
          width={23}
          height={31}
          onPress={() => navigate('Music')}
        />
        <FeedbackPressable
          accessibilityLabel="Home"
          accessibilityRole="button"
          onPress={() => navigate('Home')}
          style={styles.activeTabButton}
          contentStyle={styles.activeTabSurface}
        >
          <CroppedAsset source={ASSETS.spiral} crop={CROPS.spiral} width={33} height={31} />
        </FeedbackPressable>
        <TabButton
          label="Mountain"
          source={ASSETS.mountain}
          crop={CROPS.mountain}
          width={30}
          height={22}
          onPress={() => navigate('Mountain')}
        />
        <TabButton
          label="Chart"
          source={ASSETS.chart}
          crop={CROPS.chart}
          width={27}
          height={27}
          onPress={() => navigate('Chart')}
        />
      </View>

      <HomeIndicator />
      <ConfettiLayer ref={confettiRef} />
    </GradientScreen>
  );
}

type TabButtonProps = {
  label: string;
  source: ImageSourcePropType;
  crop: Crop;
  width: number;
  height: number;
  onPress: () => void;
};

function TabButton({ label, source, crop, width, height, onPress }: TabButtonProps) {
  return (
    <FeedbackPressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={7}
      onPress={onPress}
      style={styles.tabButton}
      contentStyle={styles.tabButtonSurface}
    >
      <CroppedAsset source={source} crop={crop} width={width} height={height} />
    </FeedbackPressable>
  );
}

export default function App() {
  const [screen, setScreen] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const root = document.documentElement;
    const body = document.body;
    const previous = {
      rootHeight: root.style.height,
      bodyHeight: body.style.height,
      bodyMargin: body.style.margin,
      bodyOverflow: body.style.overflow,
      bodyBackground: body.style.background,
    };
    root.style.height = '100%';
    body.style.height = '100%';
    body.style.margin = '0';
    body.style.overflow = 'hidden';
    body.style.background = '#111111';
    return () => {
      root.style.height = previous.rootHeight;
      body.style.height = previous.bodyHeight;
      body.style.margin = previous.bodyMargin;
      body.style.overflow = previous.bodyOverflow;
      body.style.background = previous.bodyBackground;
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.page}>
      <View testID="iphone-frame" style={styles.frame}>
        {screen ? (
          <Placeholder name={screen} onBack={() => setScreen(null)} />
        ) : (
          <Dashboard navigate={setScreen} />
        )}
      </View>
    </GestureHandlerRootView>
  );
}

const textBase: TextStyle = {
  color: '#FFFFFF',
  fontFamily: FONT_FAMILY,
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    minWidth: FRAME_WIDTH,
    minHeight: FRAME_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  frame: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
    overflow: 'hidden',
    borderRadius: 44,
    backgroundColor: '#F45C11',
    boxShadow: '0 24px 70px rgba(0,0,0,0.55)',
  } as ViewStyle,
  pressableContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBar: {
    position: 'absolute',
    top: 22,
    left: 0,
    right: 0,
    height: 20,
  },
  statusTime: {
    ...textBase,
    position: 'absolute',
    left: 50,
    top: -1,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '600',
  },
  statusRight: {
    position: 'absolute',
    right: 26,
    top: 1,
    height: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  signalBars: {
    height: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  signalBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  wifiIcon: {
    width: 18,
    height: 14,
    alignItems: 'center',
  },
  wifiArcs: {
    position: 'absolute',
    top: 0,
    width: 18,
    height: 9,
    overflow: 'hidden',
  },
  wifiOuter: {
    position: 'absolute',
    top: 0,
    width: 18,
    height: 18,
    borderWidth: 2,
    borderRadius: 9,
    borderColor: '#FFFFFF',
  },
  wifiInner: {
    position: 'absolute',
    top: 5,
    left: 4,
    width: 10,
    height: 10,
    borderWidth: 2,
    borderRadius: 5,
    borderColor: '#FFFFFF',
  },
  wifiDot: {
    position: 'absolute',
    bottom: 0,
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
  batteryShell: {
    width: 25,
    height: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 4,
    padding: 1,
  },
  batteryFill: {
    flex: 1,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  batteryNub: {
    position: 'absolute',
    right: -4,
    top: 3,
    width: 2,
    height: 4,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  progressTrack: {
    position: 'absolute',
    left: 22,
    top: 81,
    width: 349,
    height: 12,
    borderRadius: 8,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  progressComplete: {
    width: '50%',
    height: '100%',
    backgroundColor: '#FDFCFC',
  },
  progressRemaining: {
    width: '50%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  progressThumbButton: {
    position: 'absolute',
    left: 183.5,
    top: 74,
    width: 26,
    height: 26,
    zIndex: 3,
  },
  progressThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 3px 6px rgba(80,30,8,0.28)',
  } as ViewStyle,
  goalCaption: {
    ...textBase,
    position: 'absolute',
    top: 111,
    left: 0,
    width: FRAME_WIDTH,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
  lockGroup: {
    position: 'absolute',
    left: 128,
    top: 174,
    width: 137,
    height: 199,
    zIndex: 2,
  },
  shackleLayer: {
    position: 'absolute',
    left: 20,
    top: 0,
    width: 92,
    height: 96,
    filter: 'drop-shadow(0px 7px 6px rgba(116,38,4,0.18))',
  } as ViewStyle,
  bodyLayer: {
    position: 'absolute',
    left: 3,
    top: 66,
    width: 130,
    height: 133,
    transformOrigin: 'center center',
    filter: 'drop-shadow(0px 11px 9px rgba(115,35,0,0.24))',
  } as ViewStyle,
  statsRow: {
    position: 'absolute',
    left: 26,
    top: 397,
    width: 341,
    height: 37,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statGroupLeft: {
    height: 37,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statChipButton: {
    width: 34,
    height: 34,
  },
  statChipWhite: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 3px 6px rgba(74,25,8,0.2)',
  } as ViewStyle,
  leftStatText: {
    marginLeft: 10,
    height: 39,
  },
  statLabel: {
    ...textBase,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '600',
  },
  statValue: {
    ...textBase,
    marginTop: -1,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  statGroupRight: {
    height: 37,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightStatText: {
    height: 39,
    marginRight: 8,
  },
  rightAligned: {
    textAlign: 'right',
  },
  sparkleChipButton: {
    width: 35,
    height: 35,
  },
  sparkleChip: {
    width: 35,
    height: 35,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    backgroundColor: '#C2570A',
  },
  gymCard: {
    position: 'absolute',
    left: 16,
    top: 443,
    width: 361,
    height: 163,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1B2130',
    boxShadow: '0 7px 12px rgba(93,25,2,0.16)',
  } as ViewStyle,
  gymImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 361,
    height: 163,
  },
  infoButton: {
    position: 'absolute',
    right: 11,
    top: 10,
    width: 30,
    height: 30,
  },
  infoButtonSurface: {
    width: 30,
    height: 30,
  },
  gymTitle: {
    ...textBase,
    position: 'absolute',
    left: 14,
    bottom: 12,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  completeButtonHitArea: {
    position: 'absolute',
    right: 9,
    bottom: 9,
    width: 128,
    height: 46,
    alignItems: 'flex-end',
  },
  completedButtonDisabled: {
    pointerEvents: 'none',
  },
  completeButton: {
    height: 46,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    boxShadow: '0 3px 7px rgba(0,0,0,0.18)',
  } as ViewStyle,
  completeLabelStack: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeLabel: {
    position: 'absolute',
    color: '#151515',
    fontFamily: FONT_FAMILY,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    whiteSpace: 'nowrap',
  } as TextStyle,
  completedLabel: {
    fontSize: 16,
  },
  editRowButton: {
    position: 'absolute',
    left: 16,
    top: 618,
    width: 361,
    height: 42,
  },
  analysisRowButton: {
    position: 'absolute',
    left: 16,
    top: 673,
    width: 361,
    height: 42,
  },
  actionRow: {
    width: 361,
    height: 42,
    borderRadius: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#492A23',
  },
  actionLabel: {
    ...textBase,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  tabRow: {
    position: 'absolute',
    left: 15,
    top: 771,
    width: 363,
    height: 62,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabButton: {
    width: 44,
    height: 44,
  },
  tabButtonSurface: {
    width: 44,
    height: 44,
  },
  activeTabButton: {
    width: 62,
    height: 62,
  },
  activeTabSurface: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#BC4405',
    boxShadow: '0 5px 10px rgba(104,24,0,0.25)',
  } as ViewStyle,
  homeIndicator: {
    position: 'absolute',
    left: 129.5,
    bottom: 9,
    width: 134,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 58,
    width: 88,
    height: 44,
  },
  backButtonSurface: {
    width: 88,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(40,16,8,0.45)',
  },
  backButtonText: {
    ...textBase,
    fontSize: 17,
    fontWeight: '600',
  },
  placeholderTitle: {
    ...textBase,
    position: 'absolute',
    top: 402,
    width: '100%',
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
});
