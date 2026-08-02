import { Stack } from 'expo-router';
import { AuthGate } from '@/components/AuthGate';

export default function AuthLayout() {
  return (
    <AuthGate whenSignedIn="/(home)/(tabs)/">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F1117' } }} />
    </AuthGate>
  );
}
