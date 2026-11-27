import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  NotoNastaliqUrdu_400Regular,
  NotoNastaliqUrdu_700Bold,
} from '@expo-google-fonts/noto-nastaliq-urdu';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nProvider } from '../src/i18n';
import { colors } from '../src/theme';
import { PushBridge } from '../src/components/PushBridge';
import { startMeta } from '../src/meta';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ NotoNastaliqUrdu_400Regular, NotoNastaliqUrdu_700Bold });

  useEffect(() => {
    startMeta(); // Meta app events: installs and app opens for ad campaigns
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar style="light" backgroundColor={colors.primary} />
        <PushBridge />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
