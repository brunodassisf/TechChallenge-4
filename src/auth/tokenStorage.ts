import * as SecureStore from 'expo-secure-store';

const KEY = 'tc4.session';

export function loadRaw(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function saveRaw(value: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, value);
}

export async function clearRaw(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
