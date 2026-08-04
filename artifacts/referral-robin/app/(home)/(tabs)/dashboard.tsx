import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable, Platform, Modal, TextInput, Switch, Alert } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useGetUserCodes, useGetUserStats, useUpdateCode, getGetUserCodesQueryKey, getGetUserStatsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { parseDateInput, formatDateInput } from '@/utils/parseDateInput';
import { AuthGate } from '@/components/AuthGate';

export default function DashboardScreen() {
  return (
    <AuthGate whenSignedOut="/(auth)/sign-in">
      <DashboardScreenInner />
    </AuthGate>
  );
}

function DashboardScreenInner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetUserStats();
  const { data: codes = [], isLoading: codesLoading, isFetching: codesFetching, refetch: refetchCodes } = useGetUserCodes();
  const updateCode = useUpdateCode();

  const [editingCode, setEditingCode] = useState<any | null>(null);
  const [editCodeText, setEditCodeText] = useState('');
  const [editHasExpiry, setEditHasExpiry] = useState(false);
  const [editExpiryInput, setEditExpiryInput] = useState('');
  const [editExpiryError, setEditExpiryError] = useState('');

  const onRefresh = () => {
    refetchStats();
    refetchCodes();
  };

  const openEdit = (item: any) => {
    setEditingCode(item);
    setEditCodeText(item.code);
    setEditHasExpiry(!!item.expiresAt);
    setEditExpiryInput(formatDateInput(item.expiresAt));
    setEditExpiryError('');
  };

  const closeEdit = () => setEditingCode(null);

  const saveEdit = () => {
    if (!editingCode || !editCodeText.trim()) return;

    let expiresAt: string | null = null;
    if (editHasExpiry) {
      const parsed = parseDateInput(editExpiryInput);
      if (!parsed) {
        setEditExpiryError('Enter a valid future date (DD/MM/YYYY)');
        return;
      }
      expiresAt = parsed;
    }

    updateCode.mutate(
      { codeId: editingCode.id, data: { code: editCodeText.trim(), expiresAt } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetUserCodesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUserStatsQueryKey() });
          closeEdit();
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.data?.error || 'Failed to update code.');
        },
      },
    );
  };

  const renderCode = ({ item }: { item: any }) => {
    const maskedCode = item.code.length > 4 ? `••••••${item.code.slice(-4)}` : item.code;
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.brandName, { color: colors.foreground }]}>{item.brandName}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
            <Pressable onPress={() => openEdit(item)} hitSlop={8}>
              <Feather name="edit-2" size={16} color={colors.mutedForeground} />
            </Pressable>
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

      <Modal visible={!!editingCode} transparent animationType="slide" onRequestClose={closeEdit}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Edit Code</Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.secondaryForeground }]}>Referral Code or Link</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                value={editCodeText}
                onChangeText={setEditCodeText}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Pressable
              onPress={() => {
                setEditHasExpiry(v => !v);
                setEditExpiryInput('');
                setEditExpiryError('');
              }}
              style={[styles.expiryToggle, { backgroundColor: colors.background, borderColor: colors.border }]}
            >
              <Text style={{ flex: 1, color: colors.foreground, fontSize: 15 }}>This code expires</Text>
              <Switch
                value={editHasExpiry}
                onValueChange={(v) => {
                  setEditHasExpiry(v);
                  setEditExpiryInput('');
                  setEditExpiryError('');
                }}
                trackColor={{ false: colors.muted, true: colors.primary }}
                thumbColor="#fff"
              />
            </Pressable>

            {editHasExpiry && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.secondaryForeground }]}>Expiry date</Text>
                <TextInput
                  style={[styles.input, {
                    backgroundColor: colors.input,
                    borderColor: editExpiryError ? '#ef4444' : colors.border,
                    color: colors.foreground,
                  }]}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor={colors.mutedForeground}
                  value={editExpiryInput}
                  onChangeText={(t) => { setEditExpiryInput(t); setEditExpiryError(''); }}
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                  maxLength={10}
                />
                {editExpiryError ? (
                  <Text style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{editExpiryError}</Text>
                ) : null}
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: colors.muted }]}
                onPress={closeEdit}
              >
                <Text style={{ color: colors.foreground, fontSize: 16 }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, {
                  backgroundColor: colors.primary,
                  opacity: !editCodeText.trim() || updateCode.isPending ? 0.5 : 1,
                }]}
                onPress={saveEdit}
                disabled={!editCodeText.trim() || updateCode.isPending}
              >
                <Text style={{ color: colors.primaryForeground, fontSize: 16 }}>
                  {updateCode.isPending ? 'Saving…' : 'Save'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalCard: {
    padding: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    marginLeft: 4,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  expiryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
