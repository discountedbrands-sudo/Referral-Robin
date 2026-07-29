import React from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useGetUserCodes, useGetUserStats } from '@workspace/api-client-react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetUserStats();
  const { data: codes = [], isLoading: codesLoading, isFetching: codesFetching, refetch: refetchCodes } = useGetUserCodes();

  const onRefresh = () => {
    refetchStats();
    refetchCodes();
  };

  const renderCode = ({ item }: { item: any }) => {
    const maskedCode = item.code.length > 4 ? `••••••${item.code.slice(-4)}` : item.code;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.brandName, { color: colors.foreground }]}>{item.brandName}</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: item.status === 'active' ? 'rgba(34, 197, 94, 0.15)' : colors.muted }
          ]}>
            <Text style={[
              styles.statusText,
              { color: item.status === 'active' ? '#4ade80' : colors.mutedForeground }
            ]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>
        
        <View style={[styles.codeBox, { backgroundColor: colors.input }]}>
          <Feather name="lock" size={16} color={colors.mutedForeground} />
          <Text style={[styles.codeText, { color: colors.foreground }]}>{maskedCode}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Feather name="eye" size={14} color={colors.mutedForeground} />
            <Text style={[styles.statValue, { color: colors.secondaryForeground }]}>{item.timesServed} Served</Text>
          </View>
          <View style={styles.statItem}>
            <Feather name="copy" size={14} color={colors.mutedForeground} />
            <Text style={[styles.statValue, { color: colors.secondaryForeground }]}>{item.timesCopied} Copied</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Your Impact</Text>
        
        <View style={styles.overallStats}>
          <View style={styles.overallStatBox}>
            <Text style={[styles.overallStatNumber, { color: colors.foreground }]}>{stats?.totalCodesSubmitted || 0}</Text>
            <Text style={[styles.overallStatLabel, { color: colors.mutedForeground }]}>Codes</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.overallStatBox}>
            <Text style={[styles.overallStatNumber, { color: colors.foreground }]}>{stats?.totalTimesServed || 0}</Text>
            <Text style={[styles.overallStatLabel, { color: colors.mutedForeground }]}>Served</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.overallStatBox}>
            <Text style={[styles.overallStatNumber, { color: colors.primary }]}>{stats?.totalTimesCopied || 0}</Text>
            <Text style={[styles.overallStatLabel, { color: colors.primary }]}>Copied</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={codes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderCode}
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        refreshControl={
          Platform.OS !== 'web' ? (
            <RefreshControl refreshing={codesFetching && !codesLoading} onRefresh={onRefresh} tintColor={colors.primary} />
          ) : undefined
        }
        ListEmptyComponent={
          !codesLoading ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No codes yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Submit your first referral code to start earning rewards.</Text>
              <Link href="/(home)/submit" asChild>
                <Pressable style={[styles.submitButton, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.submitButtonText, { color: colors.primaryForeground }]}>Submit a Code</Text>
                </Pressable>
              </Link>
            </View>
          ) : null
        }
      />
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
    gap: 20,
  },
  title: {
    fontSize: 24,
  },
  overallStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overallStatBox: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  divider: {
    width: 1,
    height: 32,
  },
  overallStatNumber: {
    fontSize: 24,
  },
  overallStatLabel: {
    fontSize: 13,
  },
  list: {
    padding: 16,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandName: {
    fontSize: 18,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  codeText: {
    fontSize: 16,
    letterSpacing: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    gap: 12,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
  },
  emptyDesc: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  submitButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitButtonText: {
    fontSize: 16,
  },
});
