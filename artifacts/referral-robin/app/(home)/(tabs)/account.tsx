import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useUser, useClerk } from '@clerk/expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { AuthGate } from '@/components/AuthGate';

export default function AccountScreen() {
  return (
    <AuthGate whenSignedOut="/(auth)/sign-in">
      <AccountScreenInner />
    </AuthGate>
  );
}

function AccountScreenInner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Account</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="account" size={28} color="#FFF" />
          </View>
          <Text style={[styles.email, { color: colors.foreground }]}>
            {user?.primaryEmailAddress?.emailAddress ?? '—'}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => router.push('/(home)/(tabs)/dashboard')}
        >
          <Feather name="folder" size={20} color={colors.foreground} />
          <Text style={[styles.rowText, { color: colors.foreground }]}>My Codes</Text>
          <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleSignOut}
        >
          <Feather name="log-out" size={20} color={colors.destructive} />
          <Text style={[styles.rowText, { color: colors.destructive }]}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 24,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  rowText: {
    flex: 1,
    fontSize: 16,
  },
});
