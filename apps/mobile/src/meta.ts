import { AppEventsLogger, Settings } from 'react-native-fbsdk-next';

// Meta (Facebook) SDK: tells Meta when the app is installed and opened, so app install
// campaigns can be measured. App ID and client token are in app.json (react-native-fbsdk-next plugin).
// Every call is wrapped: the app must keep working even if the SDK is missing (e.g. in Expo Go).

let started = false;

export function startMeta() {
  if (started) return;
  started = true;
  try {
    Settings.initializeSDK();
  } catch {
    // not available in this build
  }
}

/** A posted ad counts as a "lead" for Meta campaigns. */
export function logAdPosted(category: string) {
  try {
    AppEventsLogger.logEvent('PostAd', { category });
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.SubmitApplication, { fb_content_type: category });
  } catch {
    // ignore
  }
}
