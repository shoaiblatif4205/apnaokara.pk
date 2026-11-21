import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { API_URL } from './api';
import { getSavedAds } from './savedAds';
import { authHeaders } from './rishtaApi';

// Push notifications. The app asks the person first (never on first open):
// after posting an ad, when following a search, or from Menu -> Notifications.
// The Expo project id comes with the Expo account at the end of the project;
// until then registration is skipped quietly.

const TOKEN_KEY = 'apna-okara.pushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export type PushState = {
  locale?: string;
  notify_ads?: boolean;
  notify_follows?: boolean;
  notify_rishta?: boolean;
  follows: { id: number; category: string; category_en: string; category_ur: string; city: string | null; city_en: string | null; city_ur: string | null }[];
};

async function post<T>(body: Record<string, unknown>, extraHeaders: Record<string, string> = {}): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1/push`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...extraHeaders }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || 'Something went wrong');
  return json as T;
}

export async function getPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY).catch(() => null);
}

export async function permissionGranted(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Get (and if `ask`, request) permission, register the phone and link its ads.
 * Returns the state, or null when notifications are not possible / refused.
 */
export async function registerPush(locale: 'en' | 'ur', ask: boolean): Promise<PushState | null> {
  if (!Device.isDevice) return null; // simulators cannot get push tokens
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Apna Okara',
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: '#15803D',
    });
  }
  let granted = await permissionGranted();
  if (!granted && ask) granted = (await Notifications.requestPermissionsAsync()).status === 'granted';
  if (!granted) return null;
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null; // added with the Expo account (see README)
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await AsyncStorage.setItem(TOKEN_KEY, token).catch(() => {});
  const state = await post<PushState>({ action: 'register', token, platform: Platform.OS === 'ios' ? 'ios' : 'android', locale });
  await linkMyAds().catch(() => {});
  await linkRishta().catch(() => {});
  return state;
}

/** Tell the server which ads this phone posted (it checks reference + phone). */
export async function linkMyAds(): Promise<void> {
  const token = await getPushToken();
  const ads = await getSavedAds();
  if (token && ads.length) await post({ action: 'ads', token, ads });
}

/** Rishta interests (only when logged in to Rishta in the app). */
export async function linkRishta(): Promise<void> {
  const token = await getPushToken();
  const h = await authHeaders();
  if (token && h.Authorization) await post({ action: 'rishta', token }, h);
}

export async function pushState(): Promise<PushState | null> {
  const token = await getPushToken();
  return token ? post<PushState>({ action: 'state', token }) : null;
}

export async function setPushOptions(locale: 'en' | 'ur', opts: { notify_ads?: boolean; notify_follows?: boolean; notify_rishta?: boolean }): Promise<PushState | null> {
  const token = await getPushToken();
  return token ? post<PushState>({ action: 'register', token, platform: Platform.OS === 'ios' ? 'ios' : 'android', locale, ...opts }) : null;
}

export async function follow(locale: 'en' | 'ur', category: string, city?: string | null): Promise<PushState | null> {
  let token = await getPushToken();
  if (!token) {
    await registerPush(locale, true);
    token = await getPushToken();
  }
  return token ? post<PushState>({ action: 'follow', token, category, city: city ?? null }) : null;
}

export async function unfollow(id: number): Promise<PushState | null> {
  const token = await getPushToken();
  return token ? post<PushState>({ action: 'unfollow', token, id }) : null;
}

/** Path inside the app for a notification's url (from the server). */
export function appPathFor(url: string | undefined): string | null {
  if (!url) return null;
  const ad = url.match(/^\/ad\/(AO-\d+)/i);
  if (ad) return `/ad/${ad[1].toUpperCase()}`;
  if (url.startsWith('/my-ads')) return '/my-ads';
  if (url.startsWith('/rishta')) return '/rishta';
  if (url.startsWith('/post-ad')) return '/post';
  if (url.startsWith('/search') || url === '/') return url === '/' ? '/' : '/search';
  return null; // other pages open on the website
}
