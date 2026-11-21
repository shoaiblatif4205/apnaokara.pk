import * as SecureStore from 'expo-secure-store';
import { API_URL } from './api';

// Rishta API for the app. The login token is kept in the phone's secure storage.

const TOKEN = 'apna-okara.rishta.token';
const ACTIVE = 'apna-okara.rishta.profile';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN);
  } catch {
    return null;
  }
}
export async function setToken(token: string | null) {
  if (token) await SecureStore.setItemAsync(TOKEN, token);
  else {
    await SecureStore.deleteItemAsync(TOKEN).catch(() => {});
    await SecureStore.deleteItemAsync(ACTIVE).catch(() => {});
  }
}
export async function setActiveProfile(id: string) {
  await SecureStore.setItemAsync(ACTIVE, id);
}

export class RishtaError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function authHeaders(): Promise<Record<string, string>> {
  const [token, active] = await Promise.all([getToken(), SecureStore.getItemAsync(ACTIVE).catch(() => null)]);
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  if (active) h['X-Rishta-Profile'] = active;
  return h;
}

export async function rishta<T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> {
  const headers = await authHeaders();
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${API_URL}${path}`, { method: body !== undefined ? 'POST' : 'GET', headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new RishtaError(r.status, j.message || 'Something went wrong');
  return j as T;
}

export const photoUrl = (id: number, clear = false) => `${API_URL}/api/rishta/photo/${id}${clear ? '?v=clear' : ''}`;

export type RCard = {
  reference: string; gender: string; age: number; height_cm: number | null; marital_status: string; education: string; profession: string | null;
  caste: string | null; city_en: string | null; city_ur: string | null; current_country: string; is_premium: boolean; photo_id: number | null;
};
