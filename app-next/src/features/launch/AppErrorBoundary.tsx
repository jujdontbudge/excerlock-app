import { Component, ErrorInfo, PropsWithChildren, ReactNode, useEffect } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Heading, PrimaryButton, ScreenShell } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { common as c } from '../../content/common';
import { reportError } from '../../observability/reportError';

/** The recovery screen a caught render error falls back to. */
export function AppErrorScreen({ onRestart }: { onRestart: () => void }) {
  return (
    <ScreenShell>
      <View style={{ flex: 1, justifyContent: 'center', gap: t.space.xl }}>
        <Heading title={c.errorTitle} support={c.errorBody} />
        <PrimaryButton label={c.errorAction} onPress={onRestart} />
      </View>
    </ScreenShell>
  );
}

type State = { failed: boolean };
type Props = PropsWithChildren<{ onError?: (error: Error, info: ErrorInfo) => void }>;

/**
 * Root render boundary. A throw anywhere below it reaches the recovery screen instead of a blank
 * window; P2-T07 reports the error from `onError`.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }
  private restart = () => {
    this.setState({ failed: false });
    router.replace('/');
  };
  render(): ReactNode {
    return this.state.failed ? <AppErrorScreen onRestart={this.restart} /> : this.props.children;
  }
}

/** Expo Router's per-route boundary shape; exported as `ErrorBoundary` from `app/_layout.tsx`. */
export function RouteErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  // Router-level errors never reach `AppErrorBoundary`, so this is their only report.
  useEffect(() => reportError(error), [error]);
  return (
    <AppErrorScreen
      onRestart={() => {
        router.replace('/');
        void retry();
      }}
    />
  );
}
