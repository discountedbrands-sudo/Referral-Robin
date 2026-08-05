import React from 'react';
import { Platform, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebTabBar } from '@/components/WebTabBar';

export default function TabLayout() {
  const colors = useColors();
  const safeAreaInsets = useSafeAreaInsets();
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      // Web gets a top nav (WebTabBar) instead of the mobile bottom-tab
      // pattern — same screens/routing either way, just a different bar.
      // Wrapped in an arrow returning JSX (not `tabBar={WebTabBar}`) — React
      // Navigation invokes `tabBar` as a plain function call, not via
      // createElement, so passing the component reference directly calls
      // its hooks outside any component's render context ("Invalid hook
      // call"). Wrapping it means what gets called is *this* arrow (which
      // calls no hooks itself), and what it returns — the <WebTabBar/>
      // element — goes through normal reconciliation instead.
      tabBar={isWeb ? (props) => <WebTabBar {...props} /> : undefined}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: isIOS ? safeAreaInsets.bottom : 8,
          paddingTop: 8,
          height: isIOS ? 60 + safeAreaInsets.bottom : 68,
        },
        tabBarBackground: () => (
          <View
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <Feather name="search" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'My Codes',
          tabBarIcon: ({ color }) => (
            <Feather name="folder" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
