import { getRequestConfig } from 'next-intl/server';
import { messages } from '@apna-okara/shared';
import { routing, type AppLocale } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as AppLocale)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: messages[locale as AppLocale],
  };
});
