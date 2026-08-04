import { Stack } from 'expo-router';

// Browsing (Explore, brand detail) is public — only screens that touch a
// signed-in user's own data (dashboard, account, submit) gate themselves
// individually via AuthGate. See app/(home)/(tabs)/dashboard.tsx etc.
export default function HomeLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F1117' } }} />;
}
