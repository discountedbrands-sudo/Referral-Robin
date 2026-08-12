import { Stack } from 'expo-router';
import { View } from 'react-native';
import { AddFab } from '@/components/AddFab';

// Browsing (Explore, brand detail) is public — only screens that touch a
// signed-in user's own data (dashboard, account, submit) gate themselves
// individually via AuthGate. See app/(home)/(tabs)/dashboard.tsx etc.
//
// AddFab lives here (not inside any one screen) so it persists across every
// screen in this group — Explore, brand detail, My Codes, Account, etc.
export default function HomeLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F1117' } }} />
      <AddFab />
    </View>
  );
}
