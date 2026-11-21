import { useEffect } from 'react';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { brand } from '@apna-okara/shared';
import { useI18n } from '../i18n';
import { appPathFor, registerPush } from '../push';

/** Keeps the push registration fresh (without asking) and opens the right screen when a notification is tapped. */
export function PushBridge() {
  const { locale } = useI18n();

  useEffect(() => {
    registerPush(locale, false).catch(() => {});
  }, [locale]);

  useEffect(() => {
    const open = (data: Record<string, unknown> | undefined) => {
      const url = typeof data?.url === 'string' ? data.url : undefined;
      const path = appPathFor(url);
      if (path) router.push(path as never);
      else if (url?.startsWith('/')) {
        const site = process.env.EXPO_PUBLIC_SITE_URL || `https://${brand.domain}`;
        Linking.openURL(`${site}/${locale}${url}`).catch(() => {});
      }
    };
    // App opened from a notification while closed
    Notifications.getLastNotificationResponseAsync()
      .then((r) => r && open(r.notification.request.content.data))
      .catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener((r) => open(r.notification.request.content.data));
    return () => sub.remove();
  }, [locale]);

  return null;
}
