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
  Text,
  View,
  type HostInstance,
  type ModalProps,
  type StyleProp,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

type NativeTitleRef = RefObject<HostInstance | null>;

const ModalTitleRefContext = createContext<NativeTitleRef | null>(null);

export interface AccessibleModalProps
  extends Omit<ModalProps, 'children' | 'onRequestClose' | 'visible'> {
  accessibilityTitle: string;
  children: ReactNode;
  fallbackFocusRef?: NativeTitleRef;
  onRequestClose: () => void;
  onReturnFocusFallback?: () => void;
  returnFocusRef?: NativeTitleRef;
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
  fallbackFocusRef,
  onRequestClose,
  onReturnFocusFallback,
  returnFocusRef,
  style,
  visible,
  ...modalProps
}: AccessibleModalProps) {
  const reduceMotion = useReducedMotion();
  const titleRef = useRef<HostInstance | null>(null);
  const wasVisible = useRef(false);

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
      animationType={reduceMotion ? 'none' : modalProps.animationType}
      onRequestClose={onRequestClose}
      transparent={modalProps.transparent ?? true}
      visible={visible}
    >
      <View
        accessibilityViewIsModal
        onAccessibilityEscape={onRequestClose}
        style={style}
      >
        <ModalTitleRefContext.Provider value={titleRef}>
          {children}
        </ModalTitleRefContext.Provider>
      </View>
    </Modal>
  );
}

export type AccessibleModalTitleProps = TextProps;

export function AccessibleModalTitle({
  accessibilityRole,
  ...props
}: AccessibleModalTitleProps) {
  const titleRef = useContext(ModalTitleRefContext);

  return (
    <Text
      {...props}
      accessible
      accessibilityRole={accessibilityRole ?? 'header'}
      ref={(node) => {
        if (titleRef) titleRef.current = node;
      }}
    />
  );
}
