import { useAuth } from '@clerk/expo';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isSignedIn, isLoaded } = useAuth();
  
  if (!isLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F1117', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#E8472E" />
      </View>
    );
  }
  
  if (isSignedIn) {
    return <Redirect href="/(home)/(tabs)/" />;
  }
  
  return <Redirect href="/(auth)/sign-in" />;
}
