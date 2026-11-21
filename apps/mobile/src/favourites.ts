import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AdCard } from './api';

// Saved (heart) ads, kept on the phone. No login.
const KEY = 'apna-okara.favs';
type Listener = () => void;
const listeners = new Set<Listener>();

export async function getFavs(): Promise<AdCard[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) || '[]');
  } catch {
    return [];
  }
}

export async function toggleFav(ad: AdCard): Promise<boolean> {
  const list = await getFavs();
  const exists = list.some((a) => a.reference === ad.reference);
  const next = exists ? list.filter((a) => a.reference !== ad.reference) : [ad, ...list].slice(0, 100);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  listeners.forEach((l) => l());
  return !exists;
}

export function onFavsChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
