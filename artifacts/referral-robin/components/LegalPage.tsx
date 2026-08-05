import React from 'react';
import { View, Text, Pressable, ScrollView, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

const CONTENT_MAX_WIDTH = 760;
const WIDE_BREAKPOINT = 860;

export type LegalSection = {
  heading: string;
  body: string;
};

export function LegalPage({
  title,
  lastUpdated,
  sections,
}: {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width >= WIDE_BREAKPOINT;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 24,
          paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 16),
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.push('/'))}
          hitSlop={8}
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </Pressable>
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: '700' }}>Referral Robin</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View
          style={{
            maxWidth: CONTENT_MAX_WIDTH,
            width: '100%',
            alignSelf: 'center',
            paddingHorizontal: 24,
            paddingTop: isWide ? 48 : 32,
            gap: 24,
          }}
        >
          <View style={{ gap: 6 }}>
            <Text style={{ color: colors.foreground, fontSize: isWide ? 34 : 26, fontWeight: '800' }}>
              {title}
            </Text>
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>Last updated: {lastUpdated}</Text>
          </View>

          <View style={{ gap: 22 }}>
            {sections.map((section) => (
              <View key={section.heading} style={{ gap: 8 }}>
                <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: '700' }}>
                  {section.heading}
                </Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 15, lineHeight: 24 }}>
                  {section.body}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
