import { Stack } from 'expo-router';
import { AuthGate } from '@/components/AuthGate';

export default function HomeLayout() {
  return (
    <AuthGate whenSignedOut="/(auth)/sign-in">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F1117' } }} />
    </AuthGate>
  );
}
