import { useEffect, useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import { PrimaryButton } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';

/**
 * Apple requires its own button wherever Sign in with Apple is offered: the mark, the wording and
 * the shape are theirs, and a home-made button is a review rejection. So the native button is used
 * whenever the device can run the flow, and the app's own button stands in everywhere else — the
 * simulator, a build without the entitlement, and every screen test.
 */
export function AppleSignInButton({
  label,
  onPress,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [native, setNative] = useState(false);
  useEffect(() => {
    let cancelled = false;
    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (!cancelled) setNative(available);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!native) return <PrimaryButton label={label} onPress={onPress} disabled={disabled} loading={loading} />;
  return (
    <AppleAuthentication.AppleAuthenticationButton
      accessibilityLabel={label}
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={t.radius.cta}
      style={{ minHeight: t.layout.button, opacity: disabled || loading ? 0.5 : 1 }}
      onPress={() => {
        if (!disabled && !loading) onPress();
      }}
    />
  );
}
