import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import type { SupportPort } from '../ports/SupportPort';
import { supportDeviceFooter, supportEmail, supportMailtoLimit, supportSubject } from '../content/support';
export function createNativeSupportPort(): SupportPort { return { send: async(category,message)=>{ const footer=category==='Problem'?`\n\n${supportDeviceFooter(Constants.expoConfig?.version??'1.0.0',Constants.expoConfig?.ios?.buildNumber??'1',Platform.Version)}`:'';const source=message.length>supportMailtoLimit?`${message.slice(0,supportMailtoLimit)}…`:message;await Linking.openURL(`mailto:${supportEmail}?subject=${encodeURIComponent(supportSubject(category))}&body=${encodeURIComponent(source+footer)}`);return {via:'mail'}; } }; }
