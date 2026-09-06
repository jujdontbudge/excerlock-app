import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type HostInstance,
  type ModalProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, gradients, layout, space, type } from './tokens';
import { ChevronIcon } from './ChevronIcon';
import { isQuestionTitle } from './navigationTitle';

type NativeTitleRef = RefObject<HostInstance | null>;
type ModalTitleContextValue = { hiddenInBody: boolean; titleRef: NativeTitleRef };

const ModalTitleRefContext = createContext<ModalTitleContextValue | null>(null);

export interface AccessibleModalProps
  extends Omit<ModalProps, 'children' | 'onRequestClose' | 'visible'> {
  accessibilityTitle: string;
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  fallbackFocusRef?: NativeTitleRef;
  headerTitle?: string;
  onRequestClose: () => void;
  onReturnFocusFallback?: () => void;
  returnFocusRef?: NativeTitleRef;
  scrollEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
  visible: boolean;
}

/**
 * Native modal boundary with one predictable accessibility contract. Use an
 * `AccessibleModalTitle` inside it so screen-reader focus lands on the visible
 * heading when the modal opens or its state changes.
 */
export function AccessibleModal({
  accessibilityTitle,
  children,
  contentContainerStyle,
  fallbackFocusRef,
  headerTitle,
  onRequestClose,
  onReturnFocusFallback,
  returnFocusRef,
  scrollEnabled = true,
  style: _legacyOverlayStyle,
  visible,
  ...modalProps
}: AccessibleModalProps) {
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const titleRef = useRef<HostInstance | null>(null);
  const wasVisible = useRef(false);
  const visibleHeaderTitle = headerTitle ?? accessibilityTitle;
  const questionTitle = isQuestionTitle(visibleHeaderTitle);

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      if (titleRef.current) {
        AccessibilityInfo.sendAccessibilityEvent(titleRef.current, 'focus');
      } else {
        AccessibilityInfo.announceForAccessibility(accessibilityTitle);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [accessibilityTitle, visible]);

  useEffect(() => {
    if (visible) {
      wasVisible.current = true;
      return;
    }

    if (!wasVisible.current) return;
    wasVisible.current = false;

    const timer = setTimeout(() => {
      const focusTarget = returnFocusRef?.current ?? fallbackFocusRef?.current;
      if (focusTarget) {
        AccessibilityInfo.sendAccessibilityEvent(focusTarget, 'focus');
      } else if (onReturnFocusFallback) {
        onReturnFocusFallback();
      } else {
        AccessibilityInfo.announceForAccessibility('Dialog closed');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [fallbackFocusRef, onReturnFocusFallback, returnFocusRef, visible]);

  return (
    <Modal
      {...modalProps}
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onRequestClose}
      presentationStyle="fullScreen"
      transparent={false}
      visible={visible}
    >
      <LinearGradient
        colors={gradients.content.colors}
        locations={gradients.content.locations}
        style={modalStyles.gradient}
      >
        <SafeAreaView edges={['right', 'bottom', 'left']} style={modalStyles.safeArea}>
          <ModalTitleRefContext.Provider value={{ hiddenInBody: true, titleRef }}>
            <View
              accessibilityViewIsModal
              onAccessibilityEscape={onRequestClose}
              style={[modalStyles.screen, { paddingTop: insets.top }]}
            >
              {questionTitle ? (
                <View style={modalStyles.questionHeader}>
                  <View style={modalStyles.questionActionRow}>
                    <Pressable
                      accessibilityLabel={`Close ${accessibilityTitle}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={onRequestClose}
                      style={modalStyles.backButton}
                    >
                      <ChevronIcon direction="left" />
                    </Pressable>
                    <View style={modalStyles.backButton} />
                  </View>
                  <Text
                    accessible
                    accessibilityRole="header"
                    numberOfLines={3}
                    ref={(node) => { titleRef.current = node; }}
                    style={modalStyles.questionTitle}
                  >
                    {visibleHeaderTitle}
                  </Text>
                </View>
              ) : (
                <View style={modalStyles.header}>
                  <Pressable
                    accessibilityLabel={`Close ${accessibilityTitle}`}
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={onRequestClose}
                    style={modalStyles.backButton}
                  >
                    <ChevronIcon direction="left" />
                  </Pressable>
                  {visibleHeaderTitle ? (
                    <Text
                      accessible
                      adjustsFontSizeToFit
                      accessibilityRole="header"
                      minimumFontScale={0.72}
                      numberOfLines={1}
                      ref={(node) => { titleRef.current = node; }}
                      style={modalStyles.headerTitle}
                    >
                      {visibleHeaderTitle}
                    </Text>
                  ) : null}
                </View>
              )}
              <ScrollView
                contentContainerStyle={[modalStyles.page, contentContainerStyle]}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={scrollEnabled}
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            </View>
          </ModalTitleRefContext.Provider>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backButton: { alignItems: 'center', height: layout.minimumTarget, justifyContent: 'center', width: layout.minimumTarget },
  gradient: { flex: 1 },
  header: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: space[2],
    maxWidth: layout.maxContentWidth,
    minHeight: layout.headerHeight,
    paddingHorizontal: layout.screenPadding - space[2],
    width: '100%',
  },
  headerTitle: { ...type.navigationTitle, color: colors.text.primary, flex: 1, paddingRight: space[3] },
  questionActionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  questionHeader: {
    alignSelf: 'center',
    gap: space[1],
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: layout.screenPadding - space[2],
    width: '100%',
  },
  questionTitle: { ...type.screenTitle, color: colors.text.primary, paddingHorizontal: space[2], textAlign: 'left' },
  page: {
    alignSelf: 'center',
    flexGrow: 1,
    maxWidth: layout.maxContentWidth,
    paddingBottom: space[8],
    paddingHorizontal: layout.screenPadding,
    paddingTop: space[2],
    width: '100%',
  },
  safeArea: { flex: 1 },
  screen: { flex: 1 },
});

export type AccessibleModalTitleProps = TextProps;

export function AccessibleModalTitle({
  accessibilityRole,
  ...props
}: AccessibleModalTitleProps) {
  const titleRef = useContext(ModalTitleRefContext);

  if (titleRef?.hiddenInBody) return null;

  return (
    <Text
      {...props}
      accessible
      accessibilityRole={accessibilityRole ?? 'header'}
      ref={(node) => {
        if (titleRef) titleRef.titleRef.current = node;
      }}
    />
  );
}
