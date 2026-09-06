import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, space, type } from './tokens';

export interface FullScreenModalPageProps {
  body?: string;
  children?: ReactNode;
  contentAlignment?: 'center' | 'top';
  footer?: ReactNode;
}

/**
 * Shared composition for full-screen modal routes: the visible title belongs
 * in AccessibleModal's header, page-specific content can be centered or begin
 * directly below it, and actions stay anchored to the bottom safe area.
 */
export function FullScreenModalPage({ body, children, contentAlignment = 'top', footer }: FullScreenModalPageProps) {
  return (
    <View style={styles.page}>
      <View style={[styles.content, contentAlignment === 'top' && styles.contentTop]}>
        {body ? <Text style={styles.body}>{body}</Text> : null}
        {children}
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { ...type.body, color: colors.text.primary, maxWidth: 340, textAlign: 'center' },
  content: { flex: 1, gap: space[4], justifyContent: 'center', width: '100%' },
  contentTop: { justifyContent: 'flex-start', paddingTop: space[6] },
  footer: { gap: space[2], paddingBottom: space[2], paddingTop: space[6], width: '100%' },
  page: { flex: 1, width: '100%' },
});
