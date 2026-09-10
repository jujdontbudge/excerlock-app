import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { SupportCategory, SupportPort } from '../ports/SupportPort';
import { supportDeviceFooter, supportEmail, supportMailtoLimit, supportSubject } from '../content/support';

function mailto(category: SupportCategory, message: string) {
  const footer =
    category === 'Problem'
      ? `\n\n${supportDeviceFooter(Constants.expoConfig?.version ?? '1.0.0', Constants.expoConfig?.ios?.buildNumber ?? '1', Platform.Version)}`
      : '';
  const source = message.length > supportMailtoLimit ? `${message.slice(0, supportMailtoLimit)}…` : message;
  return `mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject(category))}&body=${encodeURIComponent(source + footer)}`;
}

export function openSupportEmail() {
  return Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent('[ExcerLock] Support')}`);
}

export function supportDelivery(inner: SupportPort): SupportPort {
  return {
    send: async (category, message) => {
      await inner.send(category, message);
      await Linking.openURL(mailto(category, message));
      return { via: 'mail' };
    },
  };
}
