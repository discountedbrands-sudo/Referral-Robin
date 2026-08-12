import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { SafeAuthUserReader, type SafeAuthUserState } from '@/components/SafeAuthReader';

// Structural subset of @react-navigation/bottom-tabs' real BottomTabBarProps
// — only the fields this component actually reads. Deliberately not
// importing the real type: adding that package as a direct dependency here
// pulled in a *second*, separately-resolved copy of it (and transitively
// react/react-native) alongside the one expo-router already bundles
// internally, which broke hooks ("Invalid hook call") the moment this
// component rendered. `tabBar`'s real runtime value still comes from
// expo-router/Tabs — this type only needs to be structurally compatible,
// not the same nominal import.
type WebTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
};

// Mirrors AuthGate.tsx's guard: useUser() throws without a ClerkProvider
// ancestor, which app/_layout.tsx only mounts when a real Clerk key is
// configured. Same pattern used throughout this codebase for that fallback.
const rawKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';
const hasClerk = rawKey.startsWith('pk_');

// This bar renders on every (tabs) screen (Explore/Dashboard/Account), so a
// raw useUser() crash here would take down the whole tab shell — not just
// account-scoped pages. See components/SafeAuthReader.tsx: even with a real
// key (hasClerk above), useUser() can still throw if clerk-js hasn't
// finished loading (or failed), e.g. inside Facebook's in-app browser.

// Height of this bar — screens rendered underneath (Explore/Dashboard/Account)
// need this much extra top padding on web so their own content doesn't start
// underneath it (this bar is position: 'absolute', not part of layout flow —
// see below for why).
export const WEB_TAB_BAR_HEIGHT = 60;

const TABS: { name: string; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { name: 'index', label: 'Explore', icon: 'search' },
  { name: 'dashboard', label: 'My Codes', icon: 'folder' },
  { name: 'account', label: 'Account', icon: 'user' },
];

// A proper web top nav for the signed-in app shell, replacing the mobile
// bottom-tab pattern on web (native keeps the default bottom tabs — see
// (tabs)/_layout.tsx). Reuses the same underlying Tabs navigator/routing via
// React Navigation's `tabBar` render-prop, so screens/state are unchanged —
// only how the bar itself is drawn differs.
//
// Positioned absolutely (rather than as a normal flex sibling) because
// React Navigation's bottom-tabs view always places the tab bar *after* the
// screen content in its internal layout — there's no "position: top" switch,
// only where you draw it.
export function WebTabBar(props: WebTabBarProps) {
  return hasClerk ? <WebTabBarWithUser {...props} /> : <WebTabBarBase {...props} initial="?" />;
}

function WebTabBarWithUser(props: WebTabBarProps) {
  const [authState, setAuthState] = useState<SafeAuthUserState>({ isLoaded: false, isSignedIn: false, initial: null });
  const initial = (authState.initial || '?').toUpperCase();
  return (
    <>
      <SafeAuthUserReader onChange={setAuthState} />
      <WebTabBarBase {...props} initial={initial} />
    </>
  );
}

function WebTabBarBase({ state, navigation, initial }: WebTabBarProps & { initial: string }) {
  const colors = useColors();
  const router = useRouter();

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: WEB_TAB_BAR_HEIGHT,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        backgroundColor: colors.background,
      }}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <View
          style={{
            width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Feather name="repeat" size={18} color="#fff" />
        </View>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>Referral Robin</Text>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: 32 }}>
        {state.routes.map((route, i) => {
          const tab = TABS.find((t) => t.name === route.name);
          if (!tab) return null;
          const focused = state.index === i;
          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}
            >
              <Feather name={tab.icon} size={16} color={focused ? colors.primary : colors.mutedForeground} />
              <Text style={{ fontSize: 14, fontWeight: '600', color: focused ? colors.primary : colors.mutedForeground }}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => navigation.navigate('account')}
        style={{
          width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{initial}</Text>
      </Pressable>
    </View>
  );
}
