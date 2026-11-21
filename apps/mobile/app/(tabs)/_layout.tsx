import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useI18n } from '../../src/i18n';
import { colors } from '../../src/theme';

// Bottom bar: Home · Search · + Post Ad · My Ads · Menu
export default function TabsLayout() {
  const { t } = useI18n();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { height: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.home'),
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="home-outline" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('nav.search'),
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="magnify" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="post"
        options={{
          title: t('nav.postAd'),
          tabBarIcon: () => (
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -18,
              }}
            >
              <MaterialCommunityIcons name="plus" size={30} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="my-ads"
        options={{
          title: t('nav.myAds'),
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-list-outline" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: t('nav.menu'),
          tabBarIcon: ({ color }) => <MaterialCommunityIcons name="menu" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}
