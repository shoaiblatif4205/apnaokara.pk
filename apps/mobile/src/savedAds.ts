import AsyncStorage from '@react-native-async-storage/async-storage';

// Ads posted from this phone (no login): reference + phone, kept on the phone.
const KEY = 'apna-okara.myAds';
export type SavedAd = { reference: string; phone: string; key?: string }; // key = secret manage code

export async function getSavedAds(): Promise<SavedAd[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) || '[]');
  } catch {
    return [];
  }
}

export async function saveAd(ad: SavedAd): Promise<void> {
  const all = await getSavedAds();
  const old = all.find((a) => a.reference === ad.reference);
  const list = all.filter((a) => a.reference !== ad.reference);
  await AsyncStorage.setItem(KEY, JSON.stringify([{ ...ad, key: ad.key ?? old?.key }, ...list].slice(0, 20))).catch(() => {});
}
