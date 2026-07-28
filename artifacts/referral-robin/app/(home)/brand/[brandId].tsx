import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGetBrand, useGetCooldown, useGetNextCode, useConfirmCopy, useReportCode } from '@workspace/api-client-react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDevice } from '@/context/DeviceContext';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

export default function BrandRevealScreen() {
  const { brandId } = useLocalSearchParams<{ brandId: string }>();
  const id = Number(brandId);
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const deviceId = useDevice();

  const [revealedCode, setRevealedCode] = useState<{ id: number; code: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Queries
  const { data: brand, isLoading: isBrandLoading } = useGetBrand(id, { query: { enabled: !!id } });
  
  const { data: cooldownData, refetch: refetchCooldown } = useGetCooldown(
    { brandId: id, deviceId: deviceId || '' },
    { query: { enabled: !!id && !!deviceId } }
  );

  // Mutations
  const getNextCode = useGetNextCode();
  const confirmCopy = useConfirmCopy();
  const reportCode = useReportCode();

  // Cooldown countdown state
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (cooldownData?.isOnCooldown && cooldownData.remainingSeconds) {
      setTimeLeft(cooldownData.remainingSeconds);
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            refetchCooldown();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(0);
    }
  }, [cooldownData, refetchCooldown]);

  const handleGetCode = () => {
    if (!deviceId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    getNextCode.mutate({ data: { brandId: id, deviceId } }, {
      onSuccess: (data) => {
        setRevealedCode({ id: data.codeId, code: data.code });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        refetchCooldown();
      },
      onError: (err: any) => {
        if (err?.data?.error === 'CooldownError') {
          Alert.alert("Hold on", "You are on cooldown for this brand.");
          refetchCooldown();
        } else {
          Alert.alert("Error", err?.data?.error || "Failed to get code.");
        }
      }
    });
  };

  const handleCopy = async () => {
    if (!revealedCode || !deviceId) return;
    await Clipboard.setStringAsync(revealedCode.code);
    setCopied(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    confirmCopy.mutate({ data: { codeId: revealedCode.id, deviceId } });
    
    setTimeout(() => setCopied(false), 3000);
  };

  const handleReport = () => {
    if (!revealedCode || !deviceId) return;
    Alert.alert(
      "Report Code",
      "Is this code invalid or expired?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Report", 
          style: "destructive",
          onPress: () => {
            reportCode.mutate({ codeId: revealedCode.id, data: { deviceId } }, {
              onSuccess: () => {
                Alert.alert("Thanks", "Code reported. It will be reviewed.");
                setRevealedCode(null);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            });
          }
        }
      ]
    );
  };

  if (isBrandLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!brand) return null;

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isOnCooldown = timeLeft > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={28} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{brand.name}</Text>
        <View style={styles.backButton} /> {/* Spacer */}
      </View>

      <View style={styles.content}>
        <View style={styles.brandInfo}>
          {brand.currentOffer && (
            <View style={styles.offerBox}>
              <MaterialCommunityIcons name="gift" size={32} color={colors.accent} />
              <Text style={[styles.offerTitle, { color: colors.foreground }]}>Current Offer</Text>
              <Text style={[styles.offerText, { color: colors.accent }]}>{brand.currentOffer}</Text>
            </View>
          )}
        </View>

        {!revealedCode ? (
          <View style={styles.actionSection}>
            <View style={[styles.infoCard, { backgroundColor: colors.muted }]}>
              <Feather name="info" size={20} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                We will serve you one random code from the queue. You can copy it and use it right away.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.mainButton,
                { backgroundColor: isOnCooldown ? colors.muted : colors.primary },
                pressed && !isOnCooldown && { opacity: 0.8 },
                (isOnCooldown || getNextCode.isPending) && { opacity: 0.6 }
              ]}
              onPress={handleGetCode}
              disabled={isOnCooldown || getNextCode.isPending}
            >
              {getNextCode.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : isOnCooldown ? (
                <Text style={[styles.mainButtonText, { color: colors.mutedForeground }]}>
                  Cooldown: {formatTime(timeLeft)}
                </Text>
              ) : (
                <Text style={[styles.mainButtonText, { color: colors.primaryForeground }]}>
                  Get Code
                </Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View style={styles.revealSection}>
            <View style={[styles.codeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.codeLabel, { color: colors.secondaryForeground }]}>Your Referral Code</Text>
              <Text style={[styles.revealedCodeText, { color: colors.foreground }]} selectable>
                {revealedCode.code}
              </Text>
              
              <Pressable
                style={({ pressed }) => [
                  styles.copyButton,
                  { backgroundColor: copied ? '#4ade80' : colors.primary },
                  pressed && { opacity: 0.8 }
                ]}
                onPress={handleCopy}
              >
                <Feather name={copied ? "check" : "copy"} size={20} color={colors.primaryForeground} />
                <Text style={[styles.copyButtonText, { color: colors.primaryForeground }]}>
                  {copied ? "Copied!" : "Copy Code"}
                </Text>
              </Pressable>
            </View>

            <Pressable style={styles.reportButton} onPress={handleReport}>
              <Feather name="flag" size={16} color={colors.mutedForeground} />
              <Text style={[styles.reportText, { color: colors.mutedForeground }]}>Report invalid code</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 40,
  },
  brandInfo: {
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  offerBox: {
    alignItems: 'center',
    gap: 8,
  },
  offerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  offerText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  actionSection: {
    gap: 24,
    marginTop: 'auto',
    marginBottom: 40,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  mainButton: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mainButtonText: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
  },
  revealSection: {
    gap: 24,
    marginTop: 'auto',
    marginBottom: 40,
  },
  codeCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 20,
  },
  codeLabel: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
  revealedCodeText: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  copyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  reportText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
  },
});
