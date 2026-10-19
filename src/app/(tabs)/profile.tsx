import React from 'react';
import { Alert, Pressable, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, borders, radii } from '../../theme/tokens';
import PixelCard from '../../components/ui/PixelCard';
import ProgressBar from '../../components/ui/ProgressBar';
import PixelAvatar, { isAvatarId } from '../../components/ui/PixelAvatar';
import { useAuth } from '../../features/auth/AuthProvider';
import { supabase } from '../../features/auth/supabase';

/**
 * Profile screen — shows a static Level 1 / 0 XP display in Stage 1.
 * Gamification wiring happens in Stage 4.
 */
export default function ProfileScreen() {
  const { user } = useAuth();
  const displayName = typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : 'Hero';
  const avatarId = isAvatarId(user?.user_metadata?.avatar_id) ? user.user_metadata.avatar_id : 'sprout';
  const signOut = async () => {
    const { error } = await supabase!.auth.signOut();
    if (error) { Alert.alert('Could not sign out', error.message); return; }
    router.replace('/onboarding');
  };
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>Your progress & settings</Text>
      </View>
      <View style={styles.divider} />

      <View style={styles.body}>
        {/* Hero card */}
        <PixelCard style={styles.heroCard} elevated>
          <View style={styles.heroTop}>
            <View style={styles.avatarBox}>
              <PixelAvatar avatarId={avatarId} size={49} />
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{displayName}</Text>
              {user?.email ? <Text style={styles.subtitle}>{user.email}</Text> : null}
              <View style={styles.levelChip}>
                <Ionicons name="star" size={12} color={colors.warning} />
                <Text style={styles.levelText}>LEVEL 1</Text>
              </View>
            </View>
          </View>

          <View style={styles.xpSection}>
            <ProgressBar
              progress={0}
              label="XP to Level 2"
              showPercent={false}
              fillColor={colors.warning}
            />
            <Text style={styles.xpNumbers}>0 / 100 XP</Text>
          </View>
        </PixelCard>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatBox icon="trophy-outline" value="0" label="Quests\nCompleted" />
          <StatBox icon="flame-outline" value="0" label="Day\nStreak" />
          <StatBox icon="star-outline" value="0" label="Total\nXP" />
        </View>

        {/* Coming soon notice */}
        <PixelCard style={styles.comingCard}>
          <Text style={styles.comingTitle}>[ COMING IN STAGE 4 ]</Text>
          <Text style={styles.comingBody}>
            Achievements, weekly progress, notification preferences, timetable settings and data export will be available after the core task and gamification systems are built.
          </Text>
        </PixelCard>
        <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOut}><Ionicons name="log-out-outline" size={18} color={colors.dangerLight}/><Text style={styles.signOutText}>Sign out</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

function StatBox({
  icon,
  value,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  label: string;
}) {
  return (
    <View style={statStyles.box}>
      <Ionicons name={icon} size={20} color={colors.accentPrimary} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: borders.thin,
    borderColor: colors.borderDefault,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    gap: spacing.xxs,
  },
  value: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  label: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: typography.letterSpacing.wide,
    lineHeight: typography.size.xs * 1.6,
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    marginTop: spacing.xxs,
    letterSpacing: typography.letterSpacing.wide,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderDefault,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  heroCard: {
    gap: spacing.md,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarBox: {
    width: 72,
    height: 72,
    borderWidth: borders.medium,
    borderColor: colors.borderAccent,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgHighlight,
  },
  heroInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  heroName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.textPrimary,
  },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.bgHighlight,
    borderWidth: borders.thin,
    borderColor: colors.warning,
    borderRadius: radii.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    alignSelf: 'flex-start',
  },
  levelText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.warning,
    letterSpacing: typography.letterSpacing.wider,
  },
  xpSection: {
    gap: spacing.xs,
  },
  xpNumbers: {
    fontSize: typography.size.xs,
    color: colors.textMuted,
    textAlign: 'right',
    fontWeight: typography.weight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  comingCard: {
    gap: spacing.xs,
  },
  comingTitle: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.bold,
    color: colors.accentPrimary,
    letterSpacing: typography.letterSpacing.widest,
  },
  comingBody: {
    fontSize: typography.size.sm,
    color: colors.textMuted,
    lineHeight: typography.size.sm * typography.lineHeight.relaxed,
  },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, padding: spacing.md, borderWidth: borders.thin, borderColor: colors.borderDanger, borderRadius: radii.sm },
  signOutText: { color: colors.dangerLight, fontWeight: '700' },
});
