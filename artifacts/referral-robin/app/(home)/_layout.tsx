import { useAuth } from '@clerk/expo';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function HomeLayout() {
  const { isSignedIn, isLoaded, getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F1117', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E8472E" />
      </View>
    );
  }
  
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F1117' } }} />;
}
