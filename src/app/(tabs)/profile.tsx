import React, { useCallback, useState } from 'react';
import { Alert, Pressable, View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { colors, spacing, typography, borders, radii } from '../../theme/tokens';
import PixelCard from '../../components/ui/PixelCard';
import ProgressBar from '../../components/ui/ProgressBar';
import PixelAvatar, { isAvatarId } from '../../components/ui/PixelAvatar';
import ProfileOptionManager from '../../components/ui/ProfileOptionManager';
import { useAuth } from '../../features/auth/AuthProvider';
import { supabase } from '../../features/auth/supabase';
import { getProgressSummary, type ProgressSummary } from '../../features/progress/repository';

export default function ProfileScreen() {
  const db = useSQLiteContext();
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressSummary>({ totalXp: 0, level: 1, xpIntoLevel: 0, levelProgress: 0, completedQuests: 0 });
  const [progressError, setProgressError] = useState('');
  const displayName = typeof user?.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : 'Hero';
  const avatarId = isAvatarId(user?.user_metadata?.avatar_id) ? user.user_metadata.avatar_id : 'sprout';
  useFocusEffect(useCallback(() => {
    let active = true;
    getProgressSummary(db).then(value => { if (active) { setProgress(value); setProgressError(''); } })
      .catch(() => { if (active) setProgressError('Could not load your progress.'); });
    return () => { active = false; };
  }, [db]));
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

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
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
                <Text style={styles.levelText}>LEVEL {progress.level}</Text>
              </View>
            </View>
          </View>

          <View style={styles.xpSection}>
            <ProgressBar
              progress={progress.levelProgress}
              label={`XP to Level ${progress.level + 1}`}
              showPercent={false}
              fillColor={colors.success}
            />
            <Text style={styles.xpNumbers}>{progress.xpIntoLevel} / 100 XP · {progress.totalXp} total</Text>
          </View>
        </PixelCard>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatBox icon="trophy-outline" value={String(progress.completedQuests)} label="Quests\nCleared" />
          <StatBox icon="star-outline" value={String(progress.totalXp)} label="Total\nXP" />
          <StatBox icon="flash-outline" value={String(progress.level)} label="Current\nLevel" />
        </View>

        <Text style={styles.catalogHeading}>YOUR STUDY PROFILE</Text>
        <ProfileOptionManager type="subject" title="Subjects" description="Add your courses once, then select them on quests." placeholder="e.g. Biology" />
        <ProfileOptionManager type="extracurricular" title="Extracurriculars" description="Add clubs, sports, and activities for your timetable." placeholder="e.g. Debate club" />

        {progressError ? <Text style={styles.progressError}>{progressError}</Text> : null}
        <PixelCard style={styles.comingCard}>
          <Text style={styles.comingTitle}>QUEST RECORD</Text>
          <Text style={styles.comingBody}>
            Your level and XP come from completed quests. Achievement badges and streak tracking will appear here when they are backed by app data.
          </Text>
        </PixelCard>
        <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.signOut}><Ionicons name="log-out-outline" size={18} color={colors.dangerLight}/><Text style={styles.signOutText}>Sign out</Text></Pressable>
      </ScrollView>
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
    borderRadius: radii.md,
    borderBottomWidth: 4,
    borderBottomColor: '#0d0d19',
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
  },
  bodyContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
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
  catalogHeading: { color: colors.warning, fontSize: typography.size.xs, fontWeight: '800', letterSpacing: 1.4, marginTop: spacing.xs },
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
  progressError: { color: colors.dangerLight, fontSize: typography.size.xs },
});
