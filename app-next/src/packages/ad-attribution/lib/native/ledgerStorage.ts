import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { LedgerStorage } from '../sentLedger';

const keychain = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };

export const keychainLedger: LedgerStorage = {
  getItem: (key) => SecureStore.getItemAsync(key, keychain),
  setItem: (key, value) => SecureStore.setItemAsync(key, value, keychain),
};

export const installLedger: LedgerStorage = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};
